/**
 * Plant Monitor Card
 * Um cartão personalizado para o Home Assistant para monitorar plantas
 * 
 * Sem dependências externas - versão simplificada
 */

class PlantMonitorCard extends HTMLElement {
  constructor() {
    super();
    this._plants = [];
    this._config = {};
    this.attachShadow({ mode: 'open' });
  }

  // Define configuração
  setConfig(config) {
    if (!config.plants || !Array.isArray(config.plants)) {
      throw new Error('Você precisa definir pelo menos uma planta');
    }

    config.plants.forEach(plant => {
      if (!plant.moisture_entity) {
        throw new Error(`Planta ${plant.name}: sensor de umidade é obrigatório`);
      }
    });

    this._config = {
      title: 'Minhas Plantas',
      show_chart: true,
      show_stats: true,
      ...config
    };
    
    this.render();
  }

  // Define o tamanho do cartão para o Home Assistant
  getCardSize() {
    return this._config.plants ? Math.max(1, this._config.plants.length) + 1 : 2;
  }

  // Quando o Home Assistant é conectado
  set hass(hass) {
    this._hass = hass;
    this._updatePlants();
    this.render();
  }

  // Atualiza dados das plantas
  _updatePlants() {
    if (!this._hass || !this._config || !this._config.plants) return;

    this._plants = this._config.plants.map(plant => {
      const moistureState = this._hass.states[plant.moisture_entity];
      const temperatureState = plant.temperature_entity ? this._hass.states[plant.temperature_entity] : null;
      const batteryState = plant.battery_entity ? this._hass.states[plant.battery_entity] : null;
      const lightState = plant.light_entity ? this._hass.states[plant.light_entity] : null;
      const conductivityState = plant.conductivity_entity ? this._hass.states[plant.conductivity_entity] : null;

      // Verifica se algum dos sensores essenciais está indisponível
      if (!moistureState) {
        return {
          ...plant,
          error: `Entidade ${plant.moisture_entity} não encontrada`,
          status: 'error'
        };
      }

      // Parse dos valores
      const moisture = parseFloat(moistureState.state);
      const temperature = temperatureState ? parseFloat(temperatureState.state) : null;
      const battery = batteryState ? parseFloat(batteryState.state) : null;
      const light = lightState ? parseFloat(lightState.state) : null;
      const conductivity = conductivityState ? parseFloat(conductivityState.state) : null;

      // Determina o status baseado na umidade
      let status = 'ok';
      if (isNaN(moisture)) {
        status = 'unavailable';
      } else if (moisture < 20) {
        status = 'critical';
      } else if (moisture < 40) {
        status = 'warning';
      }

      // Status da bateria
      let batteryStatus = 'ok';
      if (battery !== null) {
        if (battery < 20) {
          batteryStatus = 'critical';
        } else if (battery < 40) {
          batteryStatus = 'warning';
        }
      }

      return {
        ...plant,
        moisture,
        temperature,
        battery,
        light,
        conductivity,
        status,
        batteryStatus,
        needsWater: moisture < 40,
        lastUpdated: moistureState.last_updated
      };
    });
  }

  // Escolhe ícone baseado na umidade
  _getMoistureIcon(moisture) {
    if (moisture === null || isNaN(moisture)) return 'mdi:help-circle-outline';
    if (moisture < 20) return 'mdi:water-alert';
    if (moisture < 40) return 'mdi:water-minus';
    return 'mdi:water-check';
  }

  // Escolhe ícone baseado na bateria
  _getBatteryIcon(battery) {
    if (battery === null || isNaN(battery)) return 'mdi:battery-unknown';
    if (battery < 10) return 'mdi:battery-alert';
    if (battery < 20) return 'mdi:battery-10';
    if (battery < 30) return 'mdi:battery-20';
    if (battery < 40) return 'mdi:battery-30';
    if (battery < 50) return 'mdi:battery-40';
    if (battery < 60) return 'mdi:battery-50';
    if (battery < 70) return 'mdi:battery-60';
    if (battery < 80) return 'mdi:battery-70';
    if (battery < 90) return 'mdi:battery-80';
    if (battery < 100) return 'mdi:battery-90';
    return 'mdi:battery';
  }

  // Ação de clique para mais info
  _handleMoreInfo(entityId) {
    const event = new CustomEvent('hass-more-info', {
      detail: { entityId },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  // Renderiza todo o cartão
  render() {
    if (!this._config || !this._hass) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="loading">Carregando...</div>
        </ha-card>
      `;
      return;
    }

    let plantsHtml = '';
    
    // Cria HTML para cada planta
    if (this._plants && this._plants.length > 0) {
      this._plants.forEach(plant => {
        const statusClass = plant.status || 'ok';
        const batteryStatusClass = plant.batteryStatus || 'ok';
        
        let plantImageStyle = '';
        if (plant.image) {
          plantImageStyle = `background-image: url('${plant.image}');`;
        }

        let sensorRowHtml = '';
        
        if (plant.error) {
          sensorRowHtml = `<div class="plant-error">${plant.error}</div>`;
        } else {
          // Umidade
          sensorRowHtml += `
            <div class="sensor moisture">
              <ha-icon icon="${this._getMoistureIcon(plant.moisture)}"></ha-icon>
              <span>${plant.moisture !== null ? `${plant.moisture.toFixed(1)}%` : 'N/A'}</span>
            </div>
          `;
          
          // Temperatura (se disponível)
          if (plant.temperature !== null) {
            sensorRowHtml += `
              <div class="sensor temperature">
                <ha-icon icon="mdi:thermometer"></ha-icon>
                <span>${plant.temperature.toFixed(1)}°C</span>
              </div>
            `;
          }
          
          // Bateria (se disponível)
          if (plant.battery !== null) {
            sensorRowHtml += `
              <div class="sensor battery ${batteryStatusClass}">
                <ha-icon icon="${this._getBatteryIcon(plant.battery)}"></ha-icon>
                <span>${plant.battery.toFixed(0)}%</span>
              </div>
            `;
          }
          
          // Luz (se disponível)
          if (plant.light !== null) {
            sensorRowHtml += `
              <div class="sensor light">
                <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
                <span>${plant.light} lx</span>
              </div>
            `;
          }
          
          // Condutividade (se disponível)
          if (plant.conductivity !== null) {
            sensorRowHtml += `
              <div class="sensor conductivity">
                <ha-icon icon="mdi:flash"></ha-icon>
                <span>${plant.conductivity} µS/cm</span>
              </div>
            `;
          }
        }
        
        // Botão de ação (regar)
        let actionButtonHtml = '';
        if (plant.needsWater && !plant.error) {
          actionButtonHtml = `
            <div class="plant-action">
              <button class="action-button" data-entity="${plant.moisture_entity}">
                <ha-icon icon="mdi:watering-can"></ha-icon>
              </button>
            </div>
          `;
        }
        
        // Área do gráfico
        let chartHtml = '';
        if (this._config.show_chart && !plant.error) {
          chartHtml = `
            <div class="chart-container">
              <div class="chart-placeholder">
                <span>Histórico de Umidade (Em desenvolvimento)</span>
              </div>
            </div>
          `;
        }
        
        plantsHtml += `
          <div class="plant-card ${statusClass}">
            <div class="plant-info">
              <div class="plant-image" style="${plantImageStyle}">
                ${!plant.image ? '<ha-icon icon="mdi:flower"></ha-icon>' : ''}
              </div>
              
              <div class="plant-details">
                <div class="plant-name">${plant.name}</div>
                <div class="plant-location">${plant.location || ''}</div>
                
                <div class="sensor-row">
                  ${sensorRowHtml}
                </div>
              </div>
              
              ${actionButtonHtml}
            </div>
            
            ${chartHtml}
          </div>
        `;
      });
    }
    
    // Estatísticas
    let statsHtml = '';
    if (this._config.show_stats && this._plants && this._plants.length > 0) {
      const needWaterCount = this._plants.filter(p => p.needsWater && !p.error).length;
      const healthyCount = this._plants.filter(p => p.status === 'ok').length;
      const lowBatteryCount = this._plants.filter(p => p.battery !== null && p.batteryStatus === 'critical').length;
      
      statsHtml = `
        <div class="stats-container">
          <div class="stats-header">Estatísticas</div>
          <div class="stats-content">
            <div class="stat-item">
              <div class="stat-value">${needWaterCount}</div>
              <div class="stat-label">Precisam de Água</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${healthyCount}</div>
              <div class="stat-label">Saudáveis</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${lowBatteryCount}</div>
              <div class="stat-label">Bateria Baixa</div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Monta o HTML completo do cartão
    this.shadowRoot.innerHTML = `
      <ha-card>
        <style>
          :host {
            --plant-ok-color: var(--success-color, #4CAF50);
            --plant-warning-color: var(--warning-color, #FF9800);
            --plant-critical-color: var(--error-color, #F44336);
            --plant-unavailable-color: var(--disabled-color, #9E9E9E);
            --card-background: var(--card-background-color, #FFF);
            --text-primary: var(--primary-text-color, #212121);
            --text-secondary: var(--secondary-text-color, #727272);
            --divider-color: var(--divider-color, #BDBDBD);
            --icon-color: var(--paper-item-icon-color, #44739e);
            --primary-color: var(--primary-color, #03A9F4);
          }
          
          ha-card {
            background: var(--card-background);
            border-radius: 12px;
            box-shadow: var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2));
            color: var(--text-primary);
            padding: 10px;
            transition: all 0.3s ease-out;
          }
          
          .card-header {
            color: var(--text-primary);
            font-family: var(--paper-font-headline_-_font-family);
            font-size: 24px;
            font-weight: 500;
            letter-spacing: -0.012em;
            line-height: 32px;
            padding: 8px 16px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .card-content {
            padding: 16px;
          }
          
          .plant-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            transition: all 0.3s ease;
            border-left: 4px solid var(--plant-ok-color);
          }
          
          .plant-card.critical {
            border-left-color: var(--plant-critical-color);
          }
          
          .plant-card.warning {
            border-left-color: var(--plant-warning-color);
          }
          
          .plant-card.unavailable, .plant-card.error {
            border-left-color: var(--plant-unavailable-color);
            opacity: 0.7;
          }
          
          .plant-info {
            display: flex;
            align-items: center;
          }
          
          .plant-image {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            overflow: hidden;
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(0, 0, 0, 0.1);
            flex-shrink: 0;
          }
          
          .plant-image ha-icon {
            --mdc-icon-size: 40px;
            color: var(--icon-color);
          }
          
          .plant-details {
            flex-grow: 1;
            margin-left: 16px;
          }
          
          .plant-name {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .plant-location {
            color: var(--text-secondary);
            font-size: 14px;
            margin-bottom: 8px;
          }
          
          .plant-error {
            color: var(--plant-critical-color);
            font-size: 14px;
            font-style: italic;
          }
          
          .sensor-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 8px;
          }
          
          .sensor {
            display: flex;
            align-items: center;
            font-size: 14px;
          }
          
          .sensor ha-icon {
            margin-right: 4px;
          }
          
          .moisture ha-icon {
            color: #03A9F4;
          }
          
          .temperature ha-icon {
            color: #FF5722;
          }
          
          .battery ha-icon {
            color: #4CAF50;
          }
          
          .battery.warning ha-icon {
            color: var(--plant-warning-color);
          }
          
          .battery.critical ha-icon {
            color: var(--plant-critical-color);
          }
          
          .light ha-icon {
            color: #FFC107;
          }
          
          .conductivity ha-icon {
            color: #9C27B0;
          }
          
          .plant-action {
            margin-left: 16px;
          }
          
          .action-button {
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          
          .action-button:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }
          
          .chart-container {
            margin-top: 16px;
            height: 100px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .chart-placeholder {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            font-style: italic;
          }
          
          .stats-container {
            margin-top: 24px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 12px;
            padding: 16px;
          }
          
          .stats-header {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 12px;
          }
          
          .stats-content {
            display: flex;
            justify-content: space-around;
          }
          
          .stat-item {
            text-align: center;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--primary-color);
          }
          
          .stat-label {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
          }
          
          .loading {
            padding: 20px;
            text-align: center;
            color: var(--text-secondary);
          }
        </style>
        
        <h1 class="card-header">
          <div class="name">${this._config.title}</div>
        </h1>
        
        <div class="card-content">
          ${plantsHtml}
          ${statsHtml}
        </div>
      </ha-card>
    `;
    
    // Adiciona eventos aos botões de ação
    this.shadowRoot.querySelectorAll('.action-button').forEach(button => {
      button.addEventListener('click', () => {
        const entityId = button.getAttribute('data-entity');
        if (entityId) {
          this._handleMoreInfo(entityId);
        }
      });
    });
  }
}

// Define o editor de configuração
class PlantMonitorCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this.attachShadow({ mode: 'open' });
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  setConfig(config) {
    this._config = { ...config };
    this.render();
  }

  // Gera lista de entidades disponíveis no Home Assistant
  _createEntitiesList() {
    if (!this._hass) return [];
    
    return Object.keys(this._hass.states)
      .filter(entityId => entityId.startsWith('sensor.'))
      .sort();
  }

  // Quando um valor de configuração é alterado
  _valueChanged(event) {
    if (!this._config) return;

    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const configAttribute = target.configAttribute;
    
    if (!configAttribute) return;
    
    if (configAttribute === 'plant_add') {
      if (!this._config.plants) this._config.plants = [];
      this._config.plants.push({
        name: 'Nova Planta',
        location: '',
        moisture_entity: '',
        temperature_entity: '',
        battery_entity: '',
      });
    } else if (configAttribute.startsWith('plant_remove_')) {
      const index = parseInt(configAttribute.replace('plant_remove_', ''));
      this._config.plants.splice(index, 1);
    } else if (configAttribute.includes('_')) {
      const [plantIndex, key] = configAttribute.split('_');
      if (!this._config.plants[plantIndex]) this._config.plants[plantIndex] = {};
      this._config.plants[plantIndex][key] = value;
    } else {
      this._config[configAttribute] = value;
    }

    // Dispara evento para atualizar a configuração
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
    
    this.render();
  }

  // Renderiza o editor
  render() {
    if (!this._config) {
      this.shadowRoot.innerHTML = `<div>Carregando editor...</div>`;
      return;
    }

    // Configuração geral
    let plantsHtml = '';
    const entities = this._createEntitiesList();
    
    // Gera HTML para cada planta
    if (this._config.plants) {
      this._config.plants.forEach((plant, index) => {
        // Opções para selects
        let moistureOptions = '';
        let temperatureOptions = '';
        let batteryOptions = '';
        let lightOptions = '';
        let conductivityOptions = '';
        
        entities.forEach(entity => {
          moistureOptions += `<option value="${entity}" ${plant.moisture_entity === entity ? 'selected' : ''}>${entity}</option>`;
          temperatureOptions += `<option value="${entity}" ${plant.temperature_entity === entity ? 'selected' : ''}>${entity}</option>`;
          batteryOptions += `<option value="${entity}" ${plant.battery_entity === entity ? 'selected' : ''}>${entity}</option>`;
          lightOptions += `<option value="${entity}" ${plant.light_entity === entity ? 'selected' : ''}>${entity}</option>`;
          conductivityOptions += `<option value="${entity}" ${plant.conductivity_entity === entity ? 'selected' : ''}>${entity}</option>`;
        });
        
        plantsHtml += `
          <div class="plant-config">
            <div class="plant-config-header">
              <h4>Planta ${index + 1}</h4>
              <button class="remove-button" data-config-attribute="plant_remove_${index}">
                Remover
              </button>
            </div>
            
            <div class="input-group">
              <label>Nome:</label>
              <input 
                type="text" 
                value="${plant.name || ''}" 
                data-config-attribute="${index}_name" 
                @change="${this._valueChanged.bind(this)}"
              />
            </div>
            
            <div class="input-group">
              <label>Localização:</label>
              <input 
                type="text" 
                value="${plant.location || ''}" 
                data-config-attribute="${index}_location" 
                @change="${this._valueChanged.bind(this)}"
              />
            </div>
            
            <div class="input-group">
              <label>Imagem (URL):</label>
              <input 
                type="text" 
                value="${plant.image || ''}" 
                data-config-attribute="${index}_image" 
                @change="${this._valueChanged.bind(this)}"
              />
            </div>
            
            <div class="input-group">
              <label>Sensor de Umidade (obrigatório):</label>
              <select 
                data-config-attribute="${index}_moisture_entity" 
                @change="${this._valueChanged.bind(this)}"
              >
                <option value="">Selecione uma entidade</option>
                ${moistureOptions}
              </select>
            </div>
            
            <div class="input-group">
              <label>Sensor de Temperatura:</label>
              <select 
                data-config-attribute="${index}_temperature_entity" 
                @change="${this._valueChanged.bind(this)}"
              >
                <option value="">Nenhum</option>
                ${temperatureOptions}
              </select>
            </div>
            
            <div class="input-group">
              <label>Sensor de Bateria:</label>
              <select 
                data-config-attribute="${index}_battery_entity" 
                @change="${this._valueChanged.bind(this)}"
              >
                <option value="">Nenhum</option>
                ${batteryOptions}
              </select>
            </div>
            
            <div class="input-group">
              <label>Sensor de Luz (opcional):</label>
              <select 
                data-config-attribute="${index}_light_entity" 
                @change="${this._valueChanged.bind(this)}"
              >
                <option value="">Nenhum</option>
                ${lightOptions}
              </select>
            </div>
            
            <div class="input-group">
              <label>Sensor de Condutividade (opcional):</label>
              <select 
                data-config-attribute="${index}_conductivity_entity" 
                @change="${this._valueChanged.bind(this)}"
              >
                <option value="">Nenhum</option>
                ${conductivityOptions}
              </select>
            </div>
          </div>
        `;
      });
    }
    
    this.shadowRoot.innerHTML = `
      <style>
        .card-config {
          padding: 16px;
        }
        
        .overall-config {
          margin-bottom: 24px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }
        
        label {
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        input, select {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        
        .switch-container {
          display: flex;
          align-items: center;
          margin: 8px 0;
        }
        
        .switch-container label {
          margin-right: 8px;
          margin-bottom: 0;
        }
        
        .plants-config {
          border-top: 1px solid #ccc;
          padding-top: 16px;
        }
        
        .plant-config {
          background: #f5f5f5;
          padding: 16px;
          margin-bottom: 16px;
          border-radius: 8px;
        }
        
        .plant-config-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .plant-config-header h4 {
          margin: 0;
        }
        
        .remove-button {
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
        }
        
        .add-button {
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
          cursor: pointer;
          margin-top: 8px;
        }
      </style>
      
      <div class="card-config">
        <div class="overall-config">
          <div class="input-group">
            <label>Título:</label>
            <input 
              type="text" 
              value="${this._config.title || 'Minhas Plantas'}" 
              data-config-attribute="title" 
              @change="${this._valueChanged.bind(this)}"
            />
          </div>
          
          <div class="switch-container">
            <label>Mostrar Gráfico:</label>
            <input 
              type="checkbox" 
              ?checked="${this._config.show_chart !== false}" 
              data-config-attribute="show_chart" 
              @change="${this._valueChanged.bind(this)}"
            />
          </div>
          
          <div class="switch-container">
            <label>Mostrar Estatísticas:</label>
            <input 
              type="checkbox" 
              ?checked="${this._config.show_stats !== false}" 
              data-config-attribute="show_stats" 
              @change="${this._valueChanged.bind(this)}"
            />
          </div>
        </div>
        
        <div class="plants-config">
          <h3>Plantas</h3>
          ${plantsHtml}
          
          <button 
            class="add-button" 
            data-config-attribute="plant_add" 
            @click="${this._valueChanged.bind(this)}"
          >
            Adicionar Planta
          </button>
        </div>
      </div>
    `;
    
    // Adiciona eventos
    this.shadowRoot.querySelectorAll('[data-config-attribute]').forEach(element => {
      if (element.tagName === 'BUTTON') {
        element.addEventListener('click', this._valueChanged.bind(this));
      } else {
        element.addEventListener('change', this._valueChanged.bind(this));
      }
    });
  }
}

// Registra os elementos personalizados
customElements.define('plant-monitor-card', PlantMonitorCard);
customElements.define('plant-monitor-card-editor', PlantMonitorCardEditor);

// Configuração padrão para o editor visual
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'plant-monitor-card',
  name: 'Plant Monitor Card',
  description: 'Um card para monitorar sensores de plantas',
  preview: true
});
