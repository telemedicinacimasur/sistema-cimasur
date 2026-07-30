for file in src/views/CRMView.tsx src/views/GestionView.tsx src/views/LabView.tsx src/views/SchoolView.tsx; do
  sed -i '/const { user } = useAuth();/a \
  const userRoles = user?.roles || [user?.role || "viewer"];\
  const hasFullAccess = userRoles.includes("admin");\
  const isReadonly = !hasFullAccess \&\& userRoles.some((role: string) => user.permissions?.[role]?.readonly === true);\
  const canEdit = hasFullAccess || (!isReadonly \&\& userRoles.some((role: string) => { const p = user.permissions?.[role]; return p ? p.edit !== false : true; }));\
  const canDelete = hasFullAccess || (!isReadonly \&\& userRoles.some((role: string) => { const p = user.permissions?.[role]; return p ? p.delete !== false : true; }));\
' $file
done
