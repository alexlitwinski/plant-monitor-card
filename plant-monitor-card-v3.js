// Versão com mínima dependência para resolver problemas de compatibilidade
console.log("Iniciando Plant Monitor Card");

if (!customElements.get("plant-monitor-card")) {
  console.log("Registrando plant-monitor-card");

  class PlantMonitorCard extends HTMLElement {
    constructor() {
      super();
      console.log("Construindo plant-monitor-card");
    }
  
    // Chamado quando o Home Assistant chama setConfig no elemento
    setConfig(config) {
      console.log("setConfig chamado", config);
      if (!config) {
        throw new Error("Configuração inválida");
      }
      this.config = config;
      
      // Renderiza um cartão simples
      this.innerHTML = `
        <ha-card>
          <div style="padding: 16px;">
            <h2>${config.title || "Monitoramento de Plantas"}</h2>
            <p>Card carregado com sucesso!</p>
          </div>
        </ha-card>
      `;
    }
  
    // Obtém o tamanho do cartão
    getCardSize() {
      return 2;
    }
  
    // Chamado quando o Home Assistant atualiza
    set hass(hass) {
      this.myhass = hass;
    }
  }

  // Registra o elemento personalizado
  console.log("Definindo elemento customizado");
  customElements.define("plant-monitor-card", PlantMonitorCard);

  // Adiciona à lista de cartões
  const cardType = "plant-monitor-card";
  console.log("Registrando tipo de cartão:", cardType);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: cardType,
    name: "Plant Monitor Card",
    description: "Card para monitorar sensores de plantas"
  });
  
  console.log("Plant Monitor Card inicializado com sucesso");
}
