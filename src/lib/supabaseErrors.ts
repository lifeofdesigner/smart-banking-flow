export const isMissingWireTransferAccessColumnError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? ((error as { message: string }).message || "").toLowerCase()
      : "";
  const code =
    "code" in error && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  return code === "42703"
    || (message.includes("can_initiate_wire_transfer") && message.includes("does not exist"));
};
