class PlantMonitorCard extends HTMLElement {
  // Define a configuração do card
  setConfig(config) {
    if (!config.plants) {
      throw new Error('Por favor, defina pelo menos uma planta');
    }
    this.config = config;
    
    // Criar estrutura básica do card
    this.innerHTML = `
      <ha-card header="${config.title || 'Minhas Plantas'}">
        <div class="card-content">
          <p>Plant Monitor Card - Versão Básica</p>
          <p>Total de plantas: ${config.plants.length}</p>
        </div>
      </ha-card>
    `;
  }

  // Quando o Home Assistant conecta
  set hass(hass) {
    this.myhass = hass;
    // Aqui apenas para verificar se o card está carregando
    // Implementação completa virá depois
  }

  // Informe ao HA o tamanho do card
  getCardSize() {
    return 1;
  }
}

// Registra o elemento personalizado
customElements.define('plant-monitor-card', PlantMonitorCard);

// Configuração padrão para o editor visual
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'plant-monitor-card',
  name: 'Plant Monitor Card',
  description: 'Card para monitorar sensores de plantas',
});
