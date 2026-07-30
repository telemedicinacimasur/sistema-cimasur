for file in src/views/CRMView.tsx src/views/GestionView.tsx src/views/LabView.tsx src/views/SchoolView.tsx; do
  sed -i '/const isReadonly = /d' $file
  sed -i '/const userRoles = /d' $file
  sed -i '/const hasFullAccess = /d' $file
  sed -i '/const canEdit = /d' $file
  sed -i '/const canDelete = /d' $file
done
