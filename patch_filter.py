import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """                      const activeLotesForMonth = lotesActivos.map(lote => {
                        const traj = getLoteTrajectoryUpToMonth(lote, selectedMonth, salesInputs[lote.id]);
                        return { lote, traj };
                      }).filter(item => {
                        const hasMov = item.lote.movimientos && item.lote.movimientos[selectedMonth] !== undefined;
                        return item.traj && item.traj.delivered && (hasMov || item.traj.stockDisponible > 0);
                      }).sort((a, b) => {"""

new_code = """                      const activeLotesForMonth = lotesActivos.map(lote => {
                        const traj = getLoteTrajectoryUpToMonth(lote, selectedMonth, salesInputs[lote.id]);
                        return { lote, traj };
                      }).filter(item => {
                        const mov = item.lote.movimientos?.[selectedMonth];
                        if (mov && mov.hidden) return false;
                        const hasMov = mov !== undefined;
                        return item.traj && item.traj.delivered && (hasMov || item.traj.stockDisponible > 0);
                      }).sort((a, b) => {"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
