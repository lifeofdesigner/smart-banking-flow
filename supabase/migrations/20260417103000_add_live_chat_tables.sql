-- Live chat schema used by the customer widget and support inbox

CREATE OR REPLACE FUNCTION public.can_manage_live_chat(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'support_admin')
  );
$$;

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting',
  subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT chat_conversations_status_check CHECK (status IN ('waiting', 'active', 'resolved'))
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_sender_type_check CHECK (sender_type IN ('customer', 'agent', 'system'))
);

CREATE TABLE IF NOT EXISTS public.chat_agent_status (
  agent_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer_status
  ON public.chat_conversations(customer_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_agent_status
  ON public.chat_conversations(agent_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created_at
  ON public.chat_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_read
  ON public.chat_messages(conversation_id, is_read, sender_type);

DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON public.chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_agent_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view own chat conversations" ON public.chat_conversations;
CREATE POLICY "Customers view own chat conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.can_manage_live_chat(auth.uid())
  );

DROP POLICY IF EXISTS "Customers insert own chat conversations" ON public.chat_conversations;
CREATE POLICY "Customers insert own chat conversations"
  ON public.chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    OR public.can_manage_live_chat(auth.uid())
  );

DROP POLICY IF EXISTS "Customers update own chat conversations" ON public.chat_conversations;
CREATE POLICY "Customers update own chat conversations"
  ON public.chat_conversations
  FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.can_manage_live_chat(auth.uid())
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR public.can_manage_live_chat(auth.uid())
  );

DROP POLICY IF EXISTS "Guests view guest chat conversations" ON public.chat_conversations;
CREATE POLICY "Guests view guest chat conversations"
  ON public.chat_conversations
  FOR SELECT
  TO anon
  USING (customer_id IS NULL);

DROP POLICY IF EXISTS "Guests insert guest chat conversations" ON public.chat_conversations;
CREATE POLICY "Guests insert guest chat conversations"
  ON public.chat_conversations
  FOR INSERT
  TO anon
  WITH CHECK (customer_id IS NULL);

DROP POLICY IF EXISTS "Guests update guest chat conversations" ON public.chat_conversations;
CREATE POLICY "Guests update guest chat conversations"
  ON public.chat_conversations
  FOR UPDATE
  TO anon
  USING (customer_id IS NULL)
  WITH CHECK (customer_id IS NULL);

DROP POLICY IF EXISTS "Customers view chat messages" ON public.chat_messages;
CREATE POLICY "Customers view chat messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND (
          conversation.customer_id = auth.uid()
          OR public.can_manage_live_chat(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Customers insert chat messages" ON public.chat_messages;
CREATE POLICY "Customers insert chat messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND (
          (chat_messages.sender_type = 'customer' AND conversation.customer_id = auth.uid() AND chat_messages.sender_id = auth.uid())
          OR (chat_messages.sender_type IN ('agent', 'system') AND public.can_manage_live_chat(auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "Customers update chat messages" ON public.chat_messages;
CREATE POLICY "Customers update chat messages"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND (
          conversation.customer_id = auth.uid()
          OR public.can_manage_live_chat(auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND (
          conversation.customer_id = auth.uid()
          OR public.can_manage_live_chat(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Guests view guest chat messages" ON public.chat_messages;
CREATE POLICY "Guests view guest chat messages"
  ON public.chat_messages
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND conversation.customer_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Guests insert guest chat messages" ON public.chat_messages;
CREATE POLICY "Guests insert guest chat messages"
  ON public.chat_messages
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND conversation.customer_id IS NULL
    )
    AND chat_messages.sender_type = 'customer'
    AND chat_messages.sender_id IS NULL
  );

DROP POLICY IF EXISTS "Guests update guest chat messages" ON public.chat_messages;
CREATE POLICY "Guests update guest chat messages"
  ON public.chat_messages
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND conversation.customer_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND conversation.customer_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Everyone can view agent status" ON public.chat_agent_status;
CREATE POLICY "Everyone can view agent status"
  ON public.chat_agent_status
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Support agents manage own status" ON public.chat_agent_status;
CREATE POLICY "Support agents manage own status"
  ON public.chat_agent_status
  FOR ALL
  TO authenticated
  USING (
    agent_id = auth.uid()
    AND public.can_manage_live_chat(auth.uid())
  )
  WITH CHECK (
    agent_id = auth.uid()
    AND public.can_manage_live_chat(auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO anon, authenticated, service_role;
GRANT SELECT ON public.chat_agent_status TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON public.chat_agent_status TO authenticated, service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_agent_status;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
