import { localDB } from './auth';

export const syncStudentsToSchoolPayments = async () => {
    try {
      const studentsCol = await localDB.getCollection('students');
      const paymentsCol = await localDB.getCollection('school_payments');
      
      let hasChanges = false;
      
      for (const student of studentsCol) {
        if (!student.name) continue;
        
        const expectedPayment = {
          studentId: student.id,
          tipo: 'Ingreso Alumno',
          nombreAlumno: student.name || '',
          rut: student.rut || '',
          direccion: student.region || '',
          email: student.email || '',
          telefono: student.phone || '',
          fechaPago: student.fechaPago || student.fechaFactura || student.fechaIngreso || new Date().toISOString().split('T')[0],
          montoTotalPagado: Number(student.montoTotalPagado) || 0,
          montoTotalRecibido: Number(student.montoTotalRecibido) || 0,
          nroFactura: student.nroFactura || '',
          fechaFactura: student.fechaFactura || '',
          observaciones: student.observacionesPago || '',
          historialPagos: student.historialPagos || ''
        };

        // Match by studentId, or fallback to exact name + phone if rut is generic
        const matchingPayment = paymentsCol.find((p: any) => {
          if (p.tipo !== 'Ingreso Alumno') return false;
          if (p.studentId && p.studentId === student.id) return true;
          // Legacy matching for payments that haven't been linked by studentId yet
          const rutValido = student.rut && student.rut.trim() !== '' && student.rut !== 'No detallado' && student.rut !== 'Sin RUT';
          if (rutValido && p.rut === student.rut) return true;
          if (p.nombreAlumno === student.name && p.telefono === student.phone) return true;
          return p.nombreAlumno === student.name;
        });
        
        if (!matchingPayment) {
          console.log("Global Sync: Adding payment for student:", student.name);
          await localDB.saveToCollection('school_payments', expectedPayment);
          hasChanges = true;
        } else {
          const needsUpdate = 
            matchingPayment.nombreAlumno !== expectedPayment.nombreAlumno ||
            (matchingPayment.rut || '') !== expectedPayment.rut ||
            (matchingPayment.email || '') !== expectedPayment.email ||
            (matchingPayment.telefono || '') !== expectedPayment.telefono ||
            (matchingPayment.fechaPago || '') !== (expectedPayment.fechaPago || '') ||
            Number(matchingPayment.montoTotalPagado) !== expectedPayment.montoTotalPagado ||
            Number(matchingPayment.montoTotalRecibido) !== expectedPayment.montoTotalRecibido ||
            (matchingPayment.nroFactura || '') !== expectedPayment.nroFactura ||
            (matchingPayment.fechaFactura || '') !== expectedPayment.fechaFactura ||
            (matchingPayment.observaciones || '') !== expectedPayment.observaciones ||
            (matchingPayment.historialPagos || '') !== expectedPayment.historialPagos;
            
          if (needsUpdate) {
            console.log("Global Sync: Updating payment for student:", student.name);
            await localDB.updateInCollection('school_payments', matchingPayment.id, {
              ...matchingPayment,
              ...expectedPayment
            });
            hasChanges = true;
          }
        }
      }
      
      // Cleanup payments for students that are no longer in active students list
      for (const payment of paymentsCol) {
        if (payment.tipo === 'Ingreso Alumno') {
          const studentExists = studentsCol.some((s: any) => {
            if (payment.studentId && payment.studentId === s.id) return true;
            const rutValido = s.rut && s.rut.trim() !== '' && s.rut !== 'No detallado' && s.rut !== 'Sin RUT';
            if (rutValido && s.rut === payment.rut) return true;
            if (s.name === payment.nombreAlumno && s.phone === payment.telefono) return true;
            return s.name === payment.nombreAlumno;
          });
          if (!studentExists) {
            console.log("Global Sync: Removing deleted student's payment:", payment.nombreAlumno);
            await localDB.deleteFromCollection('school_payments', payment.id);
            hasChanges = true;
          }
        }
      }
      
      if (hasChanges) {
        localDB.clearCache();
        window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_payments' } }));
      }
    } catch (err) {
      console.error("Error in student global synchronization:", err);
    }
  };

if (typeof window !== 'undefined') {
  window.addEventListener('sync-students-trigger', () => {
    syncStudentsToSchoolPayments().catch(console.error);
  });
}
