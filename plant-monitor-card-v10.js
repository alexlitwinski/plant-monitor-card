class PlantMonitorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._plants = [];
  }

  set hass(hass) {
    this._hass = hass;
    this._updatePlants();
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
      show_stats: true,
      ...config
    };

    this._updateContent();
  }

  getCardSize() {
    return this.config.plants ? this.config.plants.length + 1 : 2;
  }

  _updatePlants() {
    if (!this._hass || !this.config) return;

    this._plants = this.config.plants.map(plant => {
      const moistureState = this._hass.states[plant.moisture_entity];
      const temperatureState = plant.temperature_entity ? this._hass.states[plant.temperature_entity] : null;
      const batteryState = plant.battery_entity ? this._hass.states[plant.battery_entity] : null;
      const irrigationState = plant.irrigation_switch ? this._hass.states[plant.irrigation_switch] : null;
      const uvState = plant.uv_entity ? this._hass.states[plant.uv_entity] : null;
      const ambientTempState = plant.ambient_temp_entity ? this._hass.states[plant.ambient_temp_entity] : null;
      const soilTempState = plant.soil_temp_entity ? this._hass.states[plant.soil_temp_entity] : null;

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
      const uv = uvState ? parseFloat(uvState.state) : null;
      const ambientTemp = ambientTempState ? parseFloat(ambientTempState.state) : null;
      const soilTemp = soilTempState ? parseFloat(soilTempState.state) : null;

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

      // Status de irrigação
      let isIrrigating = false;
      if (irrigationState) {
        isIrrigating = irrigationState.state === 'on';
      }

      return {
        ...plant,
        moisture,
        temperature,
        battery,
        uv,
        ambientTemp,
        soilTemp,
        status,
        batteryStatus,
        needsWater: moisture < 40,
        isIrrigating,
        // Armazena a entidade para referência, mesmo que não encontrada
        irrigationState: irrigationState
      };
    });
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

  _handleMoreInfo(entityId) {
    const event = new CustomEvent('hass-more-info', {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _handleIrrigation(plantIndex) {
    if (plantIndex < 0 || plantIndex >= this._plants.length) return;
    
    const plant = this._plants[plantIndex];
    if (!plant.irrigation_switch || !this._hass) return;
    
    const state = this._hass.states[plant.irrigation_switch];
    if (!state) {
      console.warn(`Entidade de irrigação não encontrada: ${plant.irrigation_switch}`);
      return;
    }
    
    const isOn = state.state === 'on';
    console.log(`Alterando irrigação para ${isOn ? 'OFF' : 'ON'} na planta ${plant.name}`);
    
    this._hass.callService('switch', isOn ? 'turn_off' : 'turn_on', {
      entity_id: plant.irrigation_switch
    });
  }

  _updateContent() {
    if (!this.config) {
      return;
    }

    // Estilo CSS
    const style = `
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
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .plant-image.can-irrigate:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      
      .plant-image.irrigating {
        box-shadow: 0 0 0 4px var(--plant-ok-color);
      }
      
      .plant-image ha-icon {
        --mdc-icon-size: 40px;
        color: var(--icon-color);
      }
      
      /* Animação de irrigação */
      @keyframes waterDrop {
        0% {
          transform: translateY(-15px) translateX(-5px) scale(0);
          opacity: 0.7;
        }
        50% {
          transform: translateY(0px) translateX(0px) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateY(15px) translateX(5px) scale(0);
          opacity: 0.7;
        }
      }
      
      .water-drop {
        position: absolute;
        background-color: #03A9F4;
        width: 6px;
        height: 8px;
        border-radius: 50%;
        opacity: 0;
      }
      
      .water-drop-1 {
        top: 10px;
        left: 25px;
        animation: waterDrop 1.5s infinite;
      }
      
      .water-drop-2 {
        top: 5px;
        left: 40px;
        animation: waterDrop 1.7s infinite 0.3s;
      }
      
      .water-drop-3 {
        top: 8px;
        left: 35px;
        animation: waterDrop 1.6s infinite 0.6s;
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
        --mdc-icon-size: 16px;
        margin-right: 4px;
      }
      
      .moisture ha-icon {
        color: #03A9F4;
      }
      
      .moisture.critical ha-icon {
        color: var(--plant-critical-color);
      }
      
      .moisture.warning ha-icon {
        color: var(--plant-warning-color);
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
      
      .uv ha-icon {
        color: #9C27B0;
      }
      
      .ambient-temp ha-icon {
        color: #FF9800;
      }
      
      .soil-temp ha-icon {
        color: #795548;
      }
      
      .irrigation-status {
        position: absolute;
        bottom: -4px;
        right: -4px;
        background-color: var(--primary-color);
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .irrigation-status ha-icon {
        --mdc-icon-size: 14px;
        color: white;
      }
      
      .irrigation-status.active {
        background-color: var(--plant-ok-color);
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
    `;

    // Construção do conteúdo HTML
    let plantsHtml = '';
    
    if (this._plants && this._plants.length > 0) {
      this._plants.forEach((plant, index) => {
        // Define classes de status
        const plantCardClass = plant.status || 'ok';
        const moistureClass = plant.status || 'ok';
        const batteryClass = plant.battery !== null ? (plant.batteryStatus || 'ok') : '';
        
        // Determina se podemos irrigar essa planta
        const canIrrigate = !!plant.irrigation_switch;
        
        // Prepara estilo de imagem
        let plantImageStyle = '';
        if (plant.image) {
          plantImageStyle = `background-image: url('${plant.image}');`;
        }
        
        // Gera HTML para sensores
        let sensorsHtml = '';
        
        if (plant.error) {
          sensorsHtml = `<div class="plant-error">${plant.error}</div>`;
        } else {
          // Sensor de umidade
          sensorsHtml += `
            <div class="sensor moisture ${moistureClass}">
              <ha-icon icon="${this._getMoistureIcon(plant.moisture)}"></ha-icon>
              <span>${plant.moisture !== null && !isNaN(plant.moisture) ? `${plant.moisture.toFixed(1)}%` : 'N/A'}</span>
            </div>
          `;
          
          // Sensor de temperatura (opcional)
          if (plant.temperature !== null) {
            sensorsHtml += `
              <div class="sensor temperature">
                <ha-icon icon="mdi:thermometer"></ha-icon>
                <span>${plant.temperature.toFixed(1)}°C</span>
              </div>
            `;
          }
          
          // Sensor de bateria (opcional)
          if (plant.battery !== null) {
            sensorsHtml += `
              <div class="sensor battery ${batteryClass}">
                <ha-icon icon="${this._getBatteryIcon(plant.battery)}"></ha-icon>
                <span>${plant.battery.toFixed(0)}%</span>
              </div>
            `;
          }
          
          // Sensor de UV (opcional)
          if (plant.uv !== null) {
            sensorsHtml += `
              <div class="sensor uv">
                <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
                <span>${plant.uv.toFixed(1)} UV</span>
              </div>
            `;
          }
          
          // Sensor de temperatura ambiente (opcional)
          if (plant.ambientTemp !== null) {
            sensorsHtml += `
              <div class="sensor ambient-temp">
                <ha-icon icon="mdi:home-thermometer"></ha-icon>
                <span>${plant.ambientTemp.toFixed(1)}°C</span>
              </div>
            `;
          }
          
          // Sensor de temperatura do solo (opcional)
          if (plant.soilTemp !== null) {
            sensorsHtml += `
              <div class="sensor soil-temp">
                <ha-icon icon="mdi:thermometer-chevron-down"></ha-icon>
                <span>${plant.soilTemp.toFixed(1)}°C</span>
              </div>
            `;
          }
        }
        
        // Animação de irrigação e ícone de status
        let irrigationAnimation = '';
        let irrigationStatus = '';
        
        if (canIrrigate) {
          // Adiciona o ícone de status na imagem da planta
          irrigationStatus = `
            <div class="irrigation-status ${plant.isIrrigating ? 'active' : ''}" title="${plant.isIrrigating ? 'Irrigando' : 'Irrigação desligada'}">
              <ha-icon icon="${plant.isIrrigating ? 'mdi:water' : 'mdi:watering-can'}"></ha-icon>
            </div>
          `;
          
          // Adiciona a animação de gotas de água se estiver irrigando
          if (plant.isIrrigating) {
            irrigationAnimation = `
              <div class="water-drop water-drop-1"></div>
              <div class="water-drop water-drop-2"></div>
              <div class="water-drop water-drop-3"></div>
            `;
          }
        }
        
        plantsHtml += `
          <div class="plant-card ${plantCardClass}">
            <div class="plant-info">
              <div class="plant-image ${canIrrigate ? 'can-irrigate' : ''} ${plant.isIrrigating ? 'irrigating' : ''}" 
                   style="${plantImageStyle}" 
                   data-plant-index="${index}" 
                   title="${canIrrigate ? (plant.isIrrigating ? 'Clique para parar a irrigação' : 'Clique para iniciar a irrigação') : ''}">
                ${!plant.image ? '<ha-icon icon="mdi:flower"></ha-icon>' : ''}
                ${irrigationAnimation}
                ${irrigationStatus}
              </div>
              
              <div class="plant-details">
                <div class="plant-name">${plant.name}</div>
                ${plant.location ? `<div class="plant-location">${plant.location}</div>` : ''}
                
                <div class="sensor-row">
                  ${sensorsHtml}
                </div>
              </div>
            </div>
          </div>
        `;
      });
    }
    
    // Estatísticas (opcional)
    let statsHtml = '';
    if (this.config.show_stats && this._plants && this._plants.length > 0) {
      const needWaterCount = this._plants.filter(p => p.needsWater && !p.error).length;
      const healthyCount = this._plants.filter(p => p.status === 'ok').length;
      const lowBatteryCount = this._plants.filter(p => p.battery !== null && p.batteryStatus === 'critical').length;
      const irrigatingCount = this._plants.filter(p => p.isIrrigating).length;
      
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
            <div class="stat-item">
              <div class="stat-value">${irrigatingCount}</div>
              <div class="stat-label">Irrigando</div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Renderiza o conteúdo completo
    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <ha-card>
        <h1 class="card-header">
          <div class="name">${this.config.title}</div>
        </h1>
        <div class="card-content">
          ${plantsHtml}
          ${statsHtml}
        </div>
      </ha-card>
    `;
    
    // Adiciona eventos aos botões de ação (imagens das plantas)
    this.shadowRoot.querySelectorAll('.plant-image.can-irrigate').forEach(plantImage => {
      plantImage.addEventListener('click', () => {
        const plantIndex = parseInt(plantImage.getAttribute('data-plant-index'));
        if (!isNaN(plantIndex)) {
          this._handleIrrigation(plantIndex);
        }
      });
    });
  }
}

// Define o editor para configuração no UI
class PlantMonitorCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._config || !this._hass) {
      return;
    }

    const entities = Object.keys(this._hass.states).sort();
    const sensorEntities = entities.filter(e => e.startsWith('sensor.'));
    const switchEntities = entities.filter(e => e.startsWith('switch.'));

    let plantHtml = '';
    
    if (this._config.plants) {
      this._config.plants.forEach((plant, index) => {
        // Opções para sensores
        let moistureOptions = '<option value="">Selecione uma entidade</option>';
        let temperatureOptions = '<option value="">Nenhum</option>';
        let batteryOptions = '<option value="">Nenhum</option>';
        let irrigationOptions = '<option value="">Nenhum</option>';
        let uvOptions = '<option value="">Nenhum</option>';
        let ambientTempOptions = '<option value="">Nenhum</option>';
        let soilTempOptions = '<option value="">Nenhum</option>';
        
        // Popula opções de sensores
        sensorEntities.forEach(entity => {
          moistureOptions += `<option value="${entity}" ${plant.moisture_entity === entity ? 'selected' : ''}>${entity}</option>`;
          temperatureOptions += `<option value="${entity}" ${plant.temperature_entity === entity ? 'selected' : ''}>${entity}</option>`;
          batteryOptions += `<option value="${entity}" ${plant.battery_entity === entity ? 'selected' : ''}>${entity}</option>`;
          uvOptions += `<option value="${entity}" ${plant.uv_entity === entity ? 'selected' : ''}>${entity}</option>`;
          ambientTempOptions += `<option value="${entity}" ${plant.ambient_temp_entity === entity ? 'selected' : ''}>${entity}</option>`;
          soilTempOptions += `<option value="${entity}" ${plant.soil_temp_entity === entity ? 'selected' : ''}>${entity}</option>`;
        });
        
        // Popula opções de switches
        switchEntities.forEach(entity => {
          irrigationOptions += `<option value="${entity}" ${plant.irrigation_switch === entity ? 'selected' : ''}>${entity}</option>`;
        });
        
        plantHtml += `
          <div class="plant">
            <div class="plant-header">
              <h3>Planta ${index + 1}</h3>
              <button class="remove-button" data-index="${index}">Remover</button>
            </div>
            
            <div class="input-row">
              <label>Nome:</label>
              <input class="name-input" data-index="${index}" value="${plant.name || ''}">
            </div>
            
            <div class="input-row">
              <label>Localização:</label>
              <input class="location-input" data-index="${index}" value="${plant.location || ''}">
            </div>
            
            <div class="input-row">
              <label>Imagem (URL):</label>
              <input class="image-input" data-index="${index}" value="${plant.image || ''}">
            </div>
            
            <div class="input-row">
              <label>Umidade (obrigatório):</label>
              <select class="moisture-select" data-index="${index}">
                ${moistureOptions}
              </select>
            </div>
            
            <div class="input-row">
              <label>Temperatura:</label>
              <select class="temperature-select" data-index="${index}">
                ${temperatureOptions}
              </select>
            </div>
            
            <div class="input-row">
              <label>Bateria:</label>
              <select class="battery-select" data-index="${index}">
                ${batteryOptions}
              </select>
            </div>
            
            <div class="input-row">
              <label>Irradiação UV:</label>
              <select class="uv-select" data-index="${index}">
                ${uvOptions}
              </select>
            </div>
            
            <div class="input-row">
              <label>Temperatura Ambiente:</label>
              <select class="ambient-temp-select" data-index="${index}">
                ${ambientTempOptions}
              </select>
            </div>
            
            <div class="input-row">
              <label>Temperatura do Solo:</label>
              <select class="soil-temp-select" data-index="${index}">
                ${soilTempOptions}
              </select>
            </div>
            
            <div class="input-row">
              <label>Switch de Irrigação:</label>
              <select class="irrigation-select" data-index="${index}">
                ${irrigationOptions}
              </select>
            </div>
          </div>
        `;
      });
    }

    this.shadowRoot.innerHTML = `
      <style>
        .form-container {
          padding: 16px;
        }
        
        .title {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 16px;
        }
        
        .input-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .input-row label {
          flex: 0 0 150px;
          font-weight: 500;
        }
        
        .input-row input, .input-row select {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
        }
        
        .switch-row {
          display: flex;
          align-items: center;
          margin: 16px 0;
        }
        
        .switch-row label {
          margin-right: 8px;
        }
        
        .plants-container {
          margin-top: 24px;
        }
        
        .plants-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .plants-title {
          font-size: 16px;
          font-weight: 500;
        }
        
        .plant {
          background: var(--card-background-color, #fff);
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .plant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .plant-header h3 {
          margin: 0;
        }
        
        button {
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        button:hover {
          opacity: 0.9;
        }
        
        .remove-button {
          background: #f44336;
        }
      </style>
      
      <div class="form-container">
        <div class="title">Configuração do Cartão de Plantas</div>
        
        <div class="input-row">
          <label>Título:</label>
          <input id="title-input" value="${this._config.title || 'Minhas Plantas'}">
        </div>
        
        <div class="switch-row">
          <label>Mostrar Estatísticas:</label>
          <input type="checkbox" id="stats-checkbox" ?checked="${this._config.show_stats !== false}">
        </div>
        
        <div class="plants-container">
          <div class="plants-header">
            <div class="plants-title">Plantas</div>
            <button id="add-plant-button">Adicionar Planta</button>
          </div>
          
          <div id="plants-list">
            ${plantHtml}
          </div>
        </div>
      </div>
    `;
    
    // Adiciona event listeners
    this._addEventListeners();
  }

  _addEventListeners() {
    // Título
    const titleInput = this.shadowRoot.getElementById('title-input');
    if (titleInput) {
      titleInput.addEventListener('change', () => {
        this._updateConfig({ title: titleInput.value });
      });
    }
    
    // Checkbox de estatísticas
    const statsCheckbox = this.shadowRoot.getElementById('stats-checkbox');
    if (statsCheckbox) {
      statsCheckbox.addEventListener('change', () => {
        this._updateConfig({ show_stats: statsCheckbox.checked });
      });
    }
    
    // Botão para adicionar planta
    const addPlantButton = this.shadowRoot.getElementById('add-plant-button');
    if (addPlantButton) {
      addPlantButton.addEventListener('click', () => {
        if (!this._config.plants) this._config.plants = [];
        
        this._config.plants.push({
          name: 'Nova Planta',
          moisture_entity: '',
          temperature_entity: '',
          battery_entity: '',
          irrigation_switch: '',
          uv_entity: '',
          ambient_temp_entity: '',
          soil_temp_entity: ''
        });
        
        this._updateConfig({ plants: this._config.plants });
      });
    }
    
    // Eventos para os inputs de planta
    this.shadowRoot.querySelectorAll('.name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].name = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.location-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].location = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.image-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].image = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.moisture-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].moisture_entity = e.target.value;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.temperature-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].temperature_entity = e.target.value || null;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.battery-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].battery_entity = e.target.value || null;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.uv-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].uv_entity = e.target.value || null;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.ambient-temp-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].ambient_temp_entity = e.target.value || null;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.soil-temp-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].soil_temp_entity = e.target.value || null;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    this.shadowRoot.querySelectorAll('.irrigation-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants[index].irrigation_switch = e.target.value || null;
        this._updateConfig({ plants: this._config.plants });
      });
    });
    
    // Botões para remover plantas
    this.shadowRoot.querySelectorAll('.remove-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        this._config.plants.splice(index, 1);
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

// Informa ao Home Assistant que este cartão possui um editor
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'plant-monitor-card',
  name: 'Plant Monitor Card',
  description: 'Cartão para monitorar sensores de plantas',
  preview: true
});

console.log("Plant Monitor Card v8 carregado com sucesso! Versão: 8.0.0");
