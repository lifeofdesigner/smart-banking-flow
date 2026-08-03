export const PROFILE_AVATAR_CHANGED_EVENT = "profile-avatar-changed";

export type ProfileAvatarChangedDetail = {
  avatarUrl: string | null;
};

export const dispatchProfileAvatarChanged = (avatarUrl: string | null) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ProfileAvatarChangedDetail>(PROFILE_AVATAR_CHANGED_EVENT, { detail: { avatarUrl } }),
  );
};
