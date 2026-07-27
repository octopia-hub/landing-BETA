(function () {
  "use strict";

  window.__BRAND__ = {
    name: "Great Boost",
    legalName: "Great Boost Inc.",
    tagline: "Create, Innovate & Inspire",

    contact: {
      email: "hola@greatboostinc.com",
      phone: "+1 (000) 000 0000",
      address: "Reemplazar con ciudad / país"
    },

    // ---------------------------------------------------------------
    // Integración futura con Odoo CRM
    // ---------------------------------------------------------------
    // Este formulario hoy simula el envío en el navegador (ver main.js,
    // initForm). Para conectarlo a Odoo cuando el CRM esté disponible:
    //
    // 1) Vía "Website Forms" nativo de Odoo:
    //    - Cambiar form.endpoint por la URL del formulario de Odoo,
    //      típicamente "/website/form/<model_name>".
    //    - Añadir los campos ocultos que Odoo requiera
    //      (csrf_token, model, id, etc.) o servir la landing desde
    //      el propio Odoo si se integra como módulo.
    //
    // 2) Vía Webhook / API externa (recomendado para landing separada):
    //    - Exponer un endpoint (Odoo External API / JSON-RPC, o un
    //      microservicio intermedio) que reciba JSON y cree el lead
    //      en el modelo crm.lead.
    //    - Cambiar form.endpoint por esa URL y method a "POST".
    //    - Mapear los campos de abajo a los campos de crm.lead
    //      (contact_name, email_from, phone, partner_name, description).
    //
    // Mientras no exista backend, initForm() valida y muestra un
    // estado de éxito simulado sin perder los datos capturados
    // (quedan disponibles en el evento personalizado "leadSubmitted").
    //
    // Great Boost Pulse (pulse.js) sigue el mismo patrón para el
    // formulario del diagnóstico de madurez en IA: valida, simula el
    // envío y dispara "pulseLeadSubmitted" con { name, email, company,
    // score, level, answers } en el detail. Cuando exista el endpoint
    // de Odoo, mapear igual que el formulario de contacto (contact_name,
    // email_from, partner_name) y añadir score/level/answers como
    // campos personalizados o como descripción del lead.
    form: {
      endpoint: "",
      method: "POST"
    },

    interests: [
      "Adopción IA",
      "Cyber",
      "Preparación y Certificación",
      "Marketing Boost Agency",
      "GovTech",
      "Formación general",
      "Aún no lo sé"
    ]
  };
})();
