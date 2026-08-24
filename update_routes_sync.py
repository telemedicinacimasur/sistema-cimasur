import re

with open('src/components/ManualOperativo.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update routes description in Module 1
routes_regex = r'<h3 className="text-base font-bold text-white pt-2">Estructura Global de Módulos</h3>\s*<div className="overflow-x-auto">\s*<table className="w-full text-left text-sm">\s*<thead className="bg-\[\#152035\] text-slate-400">\s*<tr>\s*<th className="p-3 border-b border-\[\#1E293B\]">Módulo</th>\s*<th className="p-3 border-b border-\[\#1E293B\]">Propósito Principal</th>\s*<th className="p-3 border-b border-\[\#1E293B\]">Perfil de Usuario</th>\s*<th className="p-3 border-b border-\[\#1E293B\]">Exportaciones</th>\s*</tr>\s*</thead>\s*<tbody className="text-slate-300 divide-y divide-\[\#1E293B\]">[\s\S]*?</tbody>\s*</table>'

new_routes = r'''<h3 className="text-base font-bold text-white pt-2">Estructura Global de Módulos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#152035] text-slate-400">
                  <tr>
                    <th className="p-3 border-b border-[#1E293B]">Módulo (Ruta)</th>
                    <th className="p-3 border-b border-[#1E293B]">Propósito Principal</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-[#1E293B]">
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">Menú Principal (/)</td>
                    <td className="p-3">Portal de inicio y selección de módulos del sistema.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">Pizarra (/pizarra)</td>
                    <td className="p-3">Dashboard interactivo tipo Kanban para el estado de los pedidos y recordatorios de equipo.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">Laboratorio (/laboratorio)</td>
                    <td className="p-3">Gestión de 11 submódulos operativos: seguimiento, stock, elaboraciones, magistrales, nosodes, tinturas y mantención.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">Administración (/administracion)</td>
                    <td className="p-3">Gestión financiera, flujo de caja, resumen de ventas y tiendas online (MercadoLibre/Consignación).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">CRM Comercial (/crm)</td>
                    <td className="p-3">Gestión de interacciones, base de datos de clientes, control de campañas de marketing e importador de Excel.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">Gestión (/gestion)</td>
                    <td className="p-3">Expediente 360°, ficha unificada de clientes con métricas detalladas e historial de compras.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">Escuela (/escuela)</td>
                    <td className="p-3">Administración de programas educativos, cursos, alumnos inscritos, docentes y campañas de difusión.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">CPANEL (/cpanel)</td>
                    <td className="p-3">Control técnico, gestión de usuarios, auditoría, papelera de reciclaje y este manual operativo.</td>
                  </tr>
                </tbody>
              </table>'''

text = re.sub(routes_regex, new_routes, text)

# Document synchronization in 4.1
sync_text = r'''<ul className="list-disc pl-5 mt-3 space-y-1 text-slate-400 text-sm">
                  <li><strong>Campos:</strong> N° Cotización/Pedido, OT \(Orden de Transporte\), Cliente/Destinatario, Courier \(Starken, Chilexpress, CorreosChile, BlueExpress, etc\.\), Situación \(PENDIENTE, EN TRÁNSITO, OK, RECLAMO\), Fecha Cotización, Fecha Envío, Fecha Cierre, Fecha Recepción, Detalle de Seguimiento / Observaciones\.</li>
                </ul>'''
sync_repl = r'''<ul className="list-disc pl-5 mt-3 space-y-1 text-slate-400 text-sm">
                  <li><strong>Campos:</strong> N° Cotización/Pedido, OT (Orden de Transporte), Cliente/Destinatario, Courier (Starken, Chilexpress, CorreosChile, BlueExpress, etc.), Situación (PENDIENTE, EN TRÁNSITO, OK, RECLAMO), Fecha Cotización, Fecha Envío, Fecha Cierre, Fecha Recepción, Detalle de Seguimiento / Observaciones.</li>
                  <li className="text-[#38BDF8] mt-2"><strong>¡IMPORTANTE! Sincronización Automática:</strong> El campo <em>N° Cotización/Pedido</em> se sincroniza de manera bidireccional y en tiempo real con el Módulo de Administración. Al marcar un pedido como completado o al actualizar su estado en Laboratorio, el mismo N° de Cotización reflejará este cambio automáticamente en los reportes de ventas (Ventas Tienda, ML, Consignación) en Administración, conectando ambas áreas operativas.</li>
                </ul>'''

text = re.sub(sync_text, sync_repl, text)

with open('src/components/ManualOperativo.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

