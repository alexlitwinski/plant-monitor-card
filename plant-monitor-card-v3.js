class PlantMonitorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  set hass(hass) {
    this._hass = hass;
    this._updateContent();
  }

  setConfig(config) {
    if (!config.plants || !Array.isArray(config.plants)) {
      throw new Error('Você precisa definir pelo menos uma planta');
    }

    config.plants.forEach(plant => {
      if (!plant.moisture_entity) {
        throw new Error(`Planta ${plant.name}: sensor de umidade é obrigatório`);
      }
    });

    this.config = {
      title: 'Minhas Plantas',
      ...config
    };

    this._updateContent();
  }

  getCardSize() {
    return this.config.plants ? this.config.plants.length + 1 : 2;
  }

  _getMoistureIcon(moisture) {
    if (moisture === null || isNaN(moisture)) return 'mdi:help-circle-outline';
    if (moisture < 20) return 'mdi:water-alert';
    if (moisture < 40) return 'mdi:water-minus';
    return 'mdi:water-check';
  }

  _getBatteryIcon(battery) {
    if (battery === null || isNaN(battery)) return 'mdi:battery-unknown';
    if (battery < 10) return 'mdi:battery-alert';
    if (battery < 20) return 'mdi:battery-10';
    if (battery < 50) return 'mdi:battery-50';
    if (battery < 80) return 'mdi:battery-80';
    return 'mdi:battery';
  }

  _getMoistureStatusClass(moisture) {
    if (moisture === null || isNaN(moisture)) return 'unknown';
    if (moisture < 20) return 'critical';
    if (moisture < 40) return 'warning';
    return 'ok';
  }

  _getBatteryStatusClass(battery) {
    if (battery === null || isNaN(battery)) return 'unknown';
    if (battery < 20) return 'critical';
    if (battery < 40) return 'warning';
    return 'ok';
  }

  _handleMoreInfo(entityId) {
    const event = new CustomEvent('hass-more-info', {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _handleIrrigation(switchEntity) {
    if (!switchEntity || !this._hass) return;
    
    const state = this._hass.states[switchEntity];
    if (!state) return;
    
    const isOn = state.state === 'on';
    
    this._hass.callService('switch', isOn ? 'turn_off' : 'turn_on', {
      entity_id: switchEntity
    });
  }

  _updateContent() {
    if (!this.config || !this._hass) {
      return;
    }

    // CSS estilo para o componente
    const style = `
      :host {
        --plant-ok-color: var(--success-color, #4CAF50);
        --plant-warning-color: var(--warning-color, #FF9800);
        --plant-critical-color: var(--error-color, #F44336);
        --plant-unknown-color: var(--disabled-color, #9E9E9E);
      }
      
      ha-card {
        padding: 16px;
      }
      
      .card-header {
        font-size: 1.5em;
        font-weight: 500;
        margin-bottom: 16px;
      }
      
      .plant-row {
        display: flex;
        flex-direction: column;
        padding: 12px;
        margin-bottom: 12px;
        border-radius: 8px;
        background: var(--card-background-color, #FFF);
        box-shadow: 0 2px 2px 0 rgba(0,0,0,0.14), 0 1px 5px 0 rgba(0,0,0,0.12), 0 3px 1px -2px rgba(0,0,0,0.2);
      }
      
      .plant-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .plant-name {
        font-size: 1.2em;
        font-weight: 500;
      }
      
      .sensors {
        display: flex;
        flex-wrap: wrap;
      }
      
      .sensor {
        display: flex;
        align-items: center;
        margin-right: 16px;
        margin-bottom: 8px;
      }
      
      .sensor ha-icon {
        margin-right: 4px;
      }
      
      .ok {
        color: var(--plant-ok-color);
      }
      
      .warning {
        color: var(--plant-warning-color);
      }
      
      .critical {
        color: var(--plant-critical-color);
      }
      
      .unknown {
        color: var(--plant-unknown-color);
      }
      
      .actions {
        display: flex;
        margin-top: 8px;
      }
      
      .action-button {
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 0.9em;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: all 0.3s ease;
      }
      
      .action-button ha-icon {
        margin-right: 4px;
      }
      
      .action-button:hover {
        opacity: 0.9;
      }
      
      .action-button.on {
        background: var(--plant-ok-color);
      }
      
      .action-button.off {
        background: var(--primary-color);
      }
      
      .action-button.unknown {
        background: var(--plant-unknown-color);
      }
    `;

    // Constrói o conteúdo do cartão
    let plantRows = '';

    this.config.plants.forEach(plant => {
      const moistureState = this._hass.states[plant.moisture_entity];
      const batteryState = plant.battery_entity ? this._hass.states[plant.battery_entity] : null;
      const irrigationState = plant.irrigation_switch ? this._hass.states[plant.irrigation_switch] : null;

      if (!moistureState) {
        plantRows += `
          <div class="plant-row">
            <div class="plant-info">
              <div class="plant-name">${plant.name || 'Planta sem nome'}</div>
            </div>
            <div class="error">Sensor de umidade não encontrado: ${plant.moisture_entity}</div>
          </div>
        `;
        return;
      }

      const moisture = parseFloat(moistureState.state);
      const battery = batteryState ? parseFloat(batteryState.state) : null;
      
      const moistureIcon = this._getMoistureIcon(moisture);
      const batteryIcon = this._getBatteryIcon(battery);
      
      const moistureStatusClass = this._getMoistureStatusClass(moisture);
      const batteryStatusClass = this._getBatteryStatusClass(battery);

      let irrigationButton = '';
      if (irrigationState) {
        const isOn = irrigationState.state === 'on';
        const statusClass = isOn ? 'on' : 'off';
        const buttonIcon = isOn ? 'mdi:stop' : 'mdi:play';
        const buttonText = isOn ? 'Parar' : 'Irrigar';
        
        irrigationButton = `
          <button class="action-button ${statusClass}" data-switch="${plant.irrigation_switch}">
            <ha-icon icon="${buttonIcon}"></ha-icon>
            ${buttonText}
          </button>
        `;
      }

      plantRows += `
        <div class="plant-row">
          <div class="plant-info">
            <div class="plant-name">${plant.name || 'Planta sem nome'}</div>
            ${plant.location ? `<div class="plant-location">${plant.location}</div>` : ''}
          </div>
          
          <div class="sensors">
            <div class="sensor">
              <ha-icon icon="${moistureIcon}" class="${moistureStatusClass}"></ha-icon>
              <span>${isNaN(moisture) ? 'N/A' : moisture.toFixed(1) + '%'}</span>
            </div>
            
            ${battery !== null ? `
              <div class="sensor">
                <ha-icon icon="${batteryIcon}" class="${batteryStatusClass}"></ha-icon>
                <span>${battery.toFixed(0)}%</span>
              </div>
            ` : ''}
          </div>
          
          ${irrigationButton ? `
            <div class="actions">
              ${irrigationButton}
            </div>
          ` : ''}
        </div>
      `;
    });

    // Renderiza todo o conteúdo
    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card>
        <div class="card-header">${this.config.title}</div>
        <div class="card-content">
          ${plantRows}
        </div>
      </ha-card>
    `;

    // Adiciona eventos aos botões
    this.shadowRoot.querySelectorAll('.action-button').forEach(button => {
      button.addEventListener('click', () => {
        const switchEntity = button.getAttribute('data-switch');
        if (switchEntity) {
          this._handleIrrigation(switchEntity);
        }
      });
    });
  }
}

// Configuração padrão para o editor
class PlantMonitorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  _render() {
    if (!this._config) return;

    this.innerHTML = `
      <style>
        .form {
          padding: 16px;
        }
        .row {
          margin-bottom: 8px;
        }
        .plants {
          margin-top: 16px;
        }
        .plant {
          padding: 12px;
          margin-bottom: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .plant-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        input, select {
          width: 100%;
          padding: 4px;
          box-sizing: border-box;
        }
        button {
          padding: 4px 8px;
          cursor: pointer;
        }
      </style>
      <div class="form">
        <div class="row">
          <label>Título</label>
          <input id="title" value="${this._config.title || 'Minhas Plantas'}">
        </div>
        
        <div class="plants">
          <h3>Plantas</h3>
          <div id="plants-container"></div>
          <button id="add-plant">Adicionar Planta</button>
        </div>
      </div>
    `;

    // Renderiza plantas existentes
    this._renderPlants();

    // Evento de mudança do título
    this.querySelector('#title').addEventListener('input', e => {
      this._updateConfig({ title: e.target.value });
    });

    // Evento para adicionar nova planta
    this.querySelector('#add-plant').addEventListener('click', () => {
      if (!this._config.plants) this._config.plants = [];
      this._config.plants.push({
        name: 'Nova Planta',
        moisture_entity: '',
        battery_entity: '',
        irrigation_switch: ''
      });
      this._renderPlants();
      this._updateConfig({ plants: this._config.plants });
    });
  }

  _renderPlants() {
    const plantsContainer = this.querySelector('#plants-container');
    if (!plantsContainer) return;

    plantsContainer.innerHTML = '';

    if (!this._config.plants) return;

    this._config.plants.forEach((plant, index) => {
      const plantElement = document.createElement('div');
      plantElement.className = 'plant';
      plantElement.innerHTML = `
        <div class="plant-header">
          <h4>Planta ${index + 1}</h4>
          <button class="remove-plant" data-index="${index}">Remover</button>
        </div>
        <div class="row">
          <label>Nome</label>
          <input class="plant-name" data-index="${index}" value="${plant.name || ''}">
        </div>
        <div class="row">
          <label>Localização</label>
          <input class="plant-location" data-index="${index}" value="${plant.location || ''}">
        </div>
        <div class="row">
          <label>Sensor de Umidade (obrigatório)</label>
          <input class="plant-moisture" data-index="${index}" value="${plant.moisture_entity || ''}">
        </div>
        <div class="row">
          <label>Sensor de Bateria</label>
          <input class="plant-battery" data-index="${index}" value="${plant.battery_entity || ''}">
        </div>
        <div class="row">
          <label>Switch de Irrigação</label>
          <input class="plant-irrigation" data-index="${index}" value="${plant.irrigation_switch || ''}">
        </div>
      `;

      plantsContainer.appendChild(plantElement);
    });

    // Adiciona eventos para os campos
    this.querySelectorAll('.plant-name').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].name = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });

    this.querySelectorAll('.plant-location').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].location = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });

    this.querySelectorAll('.plant-moisture').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].moisture_entity = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });

    this.querySelectorAll('.plant-battery').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].battery_entity = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });

    this.querySelectorAll('.plant-irrigation').forEach(input => {
      input.addEventListener('input', e => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].irrigation_switch = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });

    this.querySelectorAll('.remove-plant').forEach(button => {
      button.addEventListener('click', e => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants.splice(index, 1);
        this._renderPlants();
        this._updateConfig({ plants: this._config.plants });
      });
    });
  }

  _updateConfig(updates) {
    const newConfig = { ...this._config, ...updates };
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// Registra os elementos personalizados
customElements.define('plant-monitor-card', PlantMonitorCard);
customElements.define('plant-monitor-card-editor', PlantMonitorCardEditor);

// Diz ao HA que este cartão possui um editor
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'plant-monitor-card',
  name: 'Plant Monitor Card',
  description: 'Card para monitorar sensores de plantas',
  preview: true
});
