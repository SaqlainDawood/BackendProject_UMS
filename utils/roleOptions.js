export const normalizeRoleOption = (role) => ({
  value: String(role?._id || ''),
  label: role?.name || '',
});

export const getRoleOptions = (roles = []) =>
  roles
    .filter((role) => role && role.isActive !== false)
    .map((role) => normalizeRoleOption(role));
