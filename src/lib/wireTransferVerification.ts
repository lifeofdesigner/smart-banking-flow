export type WireTransferVerificationStep = {
  id: string;
  step_code: string;
  title: string;
  description: string | null;
  message_title: string | null;
  message_body: string | null;
  message_background_color: string | null;
  message_border_color: string | null;
  message_icon: string | null;
  requires_code: boolean | null;
  code_label: string | null;
  placeholder: string | null;
  button_text: string | null;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
  allow_skip: boolean | null;
  requires_admin: boolean | null;
  visible_to_customer: boolean | null;
  show_icon: boolean | null;
  auto_complete: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WireTransferVerificationCodeRow = {
  id: string;
  wire_transfer_id: string;
  code_type: string;
  step_code: string | null;
  step_title: string | null;
  step_description: string | null;
  message_title: string | null;
  message_body: string | null;
  message_background_color: string | null;
  message_border_color: string | null;
  message_icon: string | null;
  requires_code: boolean | null;
  code_label: string | null;
  placeholder: string | null;
  button_text: string | null;
  icon: string | null;
  display_order: number | null;
  allow_skip: boolean | null;
  requires_admin: boolean | null;
  visible_to_customer: boolean | null;
  show_icon: boolean | null;
  auto_complete: boolean | null;
  code_value: string;
  is_verified: boolean | null;
  verified_at: string | null;
  attempts: number | null;
  created_at: string | null;
};

export const DEFAULT_STEP_COLORS = {
  background: "#FFFBEB",
  border: "#F59E0B",
  icon: "AlertTriangle",
};

export const DEFAULT_CODE_LABEL = "Enter verification code";
export const DEFAULT_BUTTON_TEXT = "Verify Code";

export const normalizeVerificationSteps = (steps: WireTransferVerificationStep[]) =>
  [...steps]
    .filter((step) => step.is_active !== false)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

export const visibleVerificationSteps = (steps: WireTransferVerificationStep[]) =>
  normalizeVerificationSteps(steps).filter((step) => step.visible_to_customer !== false);

export const stepCountLabel = (index: number, total: number) => `${index + 1} / ${total}`;

export const toStepCode = (title: string) =>
  title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "STEP";

