ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_internal_note boolean NOT NULL DEFAULT false;

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS read_at timestamptz;

ALTER TABLE public.chat_conversations
ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.chat_conversations
ADD COLUMN IF NOT EXISTS assigned_agent_name text;

ALTER TABLE public.chat_conversations
ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.chat_typing (
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_typing_conversation_updated_at
  ON public.chat_typing(conversation_id, updated_at DESC);

UPDATE public.chat_conversations conversation
SET unread_count = COALESCE(unread_counts.unread_count, 0)
FROM (
  SELECT conversation_id, COUNT(*)::integer AS unread_count
  FROM public.chat_messages
  WHERE sender_type = 'customer'
    AND is_read = false
  GROUP BY conversation_id
) unread_counts
WHERE conversation.id = unread_counts.conversation_id;

UPDATE public.chat_conversations conversation
SET unread_count = 0
WHERE conversation.unread_count IS NULL;

UPDATE public.chat_conversations conversation
SET assigned_agent_name = profile.full_name
FROM public.profiles profile
WHERE conversation.agent_id = profile.id
  AND COALESCE(conversation.assigned_agent_name, '') = '';

ALTER TABLE public.chat_typing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view typing status" ON public.chat_typing;
CREATE POLICY "Participants view typing status"
  ON public.chat_typing
  FOR SELECT
  TO authenticated
  USING (
    public.can_manage_live_chat(auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_typing.conversation_id
        AND conversation.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Guests view guest typing status" ON public.chat_typing;
CREATE POLICY "Guests view guest typing status"
  ON public.chat_typing
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_typing.conversation_id
        AND conversation.customer_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Participants manage own typing status" ON public.chat_typing;
CREATE POLICY "Participants manage own typing status"
  ON public.chat_typing
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.can_manage_live_chat(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.chat_conversations conversation
        WHERE conversation.id = chat_typing.conversation_id
          AND conversation.customer_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.can_manage_live_chat(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.chat_conversations conversation
        WHERE conversation.id = chat_typing.conversation_id
          AND conversation.customer_id = auth.uid()
      )
    )
  );

GRANT SELECT ON public.chat_typing TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.chat_typing TO authenticated, service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
