import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';

class PlantMonitorCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _plants: { type: Array },
    };
  }

  static getConfigElement() {
    return document.createElement('plant-monitor-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'Minhas Plantas',
      show_chart: true,
      show_stats: true,
      plants: [
        {
          name: 'Planta 1',
          image: '/local/images/plants/plant1.jpg',
          location: 'Sala de Estar',
          moisture_entity: 'sensor.planta_1_umidade_solo',
          temperature_entity: 'sensor.planta_1_temperatura',
          battery_entity: 'sensor.planta_1_bateria',
          light_entity: '', // opcional
          conductivity_entity: '', // opcional
        }
      ]
    };
  }

  constructor() {
    super();
    this._plants = [];
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
      show_chart: true,
      show_stats: true,
      ...config
    };
  }

  updated(changedProps) {
    if (changedProps.has('hass') || changedProps.has('config')) {
      this._updatePlants();
    }
  }

  _updatePlants() {
    if (!this.hass || !this.config) return;

    this._plants = this.config.plants.map(plant => {
      const moistureState = this.hass.states[plant.moisture_entity];
      const temperatureState = plant.temperature_entity ? this.hass.states[plant.temperature_entity] : null;
      const batteryState = plant.battery_entity ? this.hass.states[plant.battery_entity] : null;
      const lightState = plant.light_entity ? this.hass.states[plant.light_entity] : null;
      const conductivityState = plant.conductivity_entity ? this.hass.states[plant.conductivity_entity] : null;

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
    });
    this.dispatchEvent(event);
  }

  _handleActionClick(plant) {
    if (!plant.needsWater) return;
    // Você pode disparar uma ação (como marcar a planta como regada)
    this._handleMoreInfo(plant.moisture_entity);
  }

  // Renderiza o gráfico para uma planta usando uma entidade específica
  _renderChart(plant) {
    if (!this.config.show_chart || !plant.moisture_entity) return html``;

    // Recupera o histórico da entidade
    const historyData = [];
    // Nota: O acesso ao histórico requer a API do HA - e seria implementado
    // através de chamadas ao websocket ou configuração específica

    return html`
      <div class="chart-container">
        <!-- Placeholder para o gráfico -->
        <div class="chart-placeholder">
          <span>Histórico de Umidade (Em desenvolvimento)</span>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    return html`
      <ha-card>
        <h1 class="card-header">
          <div class="name">${this.config.title}</div>
        </h1>
        
        <div class="card-content">
          ${this._plants.map(plant => html`
            <div class="plant-card ${classMap({
              'critical': plant.status === 'critical',
              'warning': plant.status === 'warning',
              'ok': plant.status === 'ok',
              'unavailable': plant.status === 'unavailable',
              'error': plant.status === 'error'
            })}">
              <div class="plant-info">
                <div class="plant-image" style="${plant.image ? `background-image: url('${plant.image}')` : ''}">
                  ${!plant.image ? html`<ha-icon icon="mdi:flower"></ha-icon>` : ''}
                </div>
                
                <div class="plant-details">
                  <div class="plant-name">${plant.name}</div>
                  <div class="plant-location">${plant.location || ''}</div>
                  
                  ${plant.error ? html`
                    <div class="plant-error">${plant.error}</div>
                  ` : html`
                    <div class="sensor-row">
                      <div class="sensor moisture">
                        <ha-icon icon="${this._getMoistureIcon(plant.moisture)}"></ha-icon>
                        <span>${plant.moisture !== null ? `${plant.moisture.toFixed(1)}%` : 'N/A'}</span>
                      </div>
                      
                      ${plant.temperature !== null ? html`
                        <div class="sensor temperature">
                          <ha-icon icon="mdi:thermometer"></ha-icon>
                          <span>${plant.temperature.toFixed(1)}°C</span>
                        </div>
                      ` : ''}
                      
                      ${plant.battery !== null ? html`
                        <div class="sensor battery ${plant.batteryStatus}">
                          <ha-icon icon="${this._getBatteryIcon(plant.battery)}"></ha-icon>
                          <span>${plant.battery.toFixed(0)}%</span>
                        </div>
                      ` : ''}
                      
                      ${plant.light !== null ? html`
                        <div class="sensor light">
                          <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
                          <span>${plant.light} lx</span>
                        </div>
                      ` : ''}
                      
                      ${plant.conductivity !== null ? html`
                        <div class="sensor conductivity">
                          <ha-icon icon="mdi:flash"></ha-icon>
                          <span>${plant.conductivity} µS/cm</span>
                        </div>
                      ` : ''}
                    </div>
                  `}
                </div>
                
                ${plant.needsWater && !plant.error ? html`
                  <div class="plant-action">
                    <button @click="${() => this._handleActionClick(plant)}">
                      <ha-icon icon="mdi:watering-can"></ha-icon>
                    </button>
                  </div>
                ` : ''}
              </div>
              
              ${this.config.show_chart && !plant.error ? this._renderChart(plant) : ''}
            </div>
          `)}
          
          ${this.config.show_stats && this._plants.length > 0 ? html`
            <div class="stats-container">
              <div class="stats-header">Estatísticas</div>
              <div class="stats-content">
                <div class="stat-item">
                  <div class="stat-value">${this._plants.filter(p => p.needsWater && !p.error).length}</div>
                  <div class="stat-label">Precisam de Água</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${this._plants.filter(p => p.status === 'ok').length}</div>
                  <div class="stat-label">Saudáveis</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${this._plants.filter(p => p.battery !== null && p.batteryStatus === 'critical').length}</div>
                  <div class="stat-label">Bateria Baixa</div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
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
        --mdc-icon-size: 16px;
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
      
      .plant-action button {
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
      
      .plant-action button:hover {
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
    `;
  }
}

customElements.define('plant-monitor-card', PlantMonitorCard);

// Editor
class PlantMonitorCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _entities: { type: Array },
    };
  }

  setConfig(config) {
    this._config = { ...config };
    this._createEntitiesList();
  }

  _createEntitiesList() {
    if (!this.hass) return;
    
    this._entities = Object.keys(this.hass.states).filter(entityId => 
      entityId.startsWith('sensor.')
    ).sort();
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;

    const target = ev.target;
    const value = target.value;
    
    if (target.configValue) {
      if (target.configValue === 'plant_add') {
        if (!this._config.plants) this._config.plants = [];
        this._config.plants.push({
          name: 'Nova Planta',
          location: '',
          moisture_entity: '',
          temperature_entity: '',
          battery_entity: '',
        });
      } else if (target.configValue.startsWith('plant_remove_')) {
        const index = parseInt(target.configValue.replace('plant_remove_', ''));
        this._config.plants.splice(index, 1);
      } else if (target.configValue.includes('_')) {
        const [plantIndex, key] = target.configValue.split('_');
        if (!this._config.plants[plantIndex]) this._config.plants[plantIndex] = {};
        this._config.plants[plantIndex][key] = value;
      } else {
        this._config[target.configValue] = target.checked !== undefined ? target.checked : value;
      }
    }

    // Dispara o evento para atualizar a configuração
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="overall-config">
          <paper-input
            label="Título"
            .value="${this._config.title || ''}"
            .configValue="${'title'}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
          
          <ha-formfield label="Mostrar Gráfico">
            <ha-switch
              .checked="${this._config.show_chart !== false}"
              .configValue="${'show_chart'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
          
          <ha-formfield label="Mostrar Estatísticas">
            <ha-switch
              .checked="${this._config.show_stats !== false}"
              .configValue="${'show_stats'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
        </div>
        
        <div class="plants-config">
          <h3>Plantas</h3>
          
          ${this._config.plants && this._config.plants.map((plant, index) => html`
            <div class="plant-config">
              <h4>Planta ${index + 1}
                <paper-icon-button
                  icon="mdi:delete"
                  .configValue="${`plant_remove_${index}`}"
                  @click="${this._valueChanged}"
                ></paper-icon-button>
              </h4>
              
              <paper-input
                label="Nome"
                .value="${plant.name || ''}"
                .configValue="${`${index}_name`}"
                @value-changed="${this._valueChanged}"
              ></paper-input>
              
              <paper-input
                label="Localização"
                .value="${plant.location || ''}"
                .configValue="${`${index}_location`}"
                @value-changed="${this._valueChanged}"
              ></paper-input>
              
              <paper-input
                label="Imagem (URL)"
                .value="${plant.image || ''}"
                .configValue="${`${index}_image`}"
                @value-changed="${this._valueChanged}"
              ></paper-input>
              
              <ha-entity-picker
                label="Sensor de Umidade (obrigatório)"
                .hass="${this.hass}"
                .value="${plant.moisture_entity || ''}"
                .configValue="${`${index}_moisture_entity`}"
                domain-filter="sensor"
                @value-changed="${this._valueChanged}"
              ></ha-entity-picker>
              
              <ha-entity-picker
                label="Sensor de Temperatura"
                .hass="${this.hass}"
                .value="${plant.temperature_entity || ''}"
                .configValue="${`${index}_temperature_entity`}"
                domain-filter="sensor"
                @value-changed="${this._valueChanged}"
              ></ha-entity-picker>
              
              <ha-entity-picker
                label="Sensor de Bateria"
                .hass="${this.hass}"
                .value="${plant.battery_entity || ''}"
                .configValue="${`${index}_battery_entity`}"
                domain-filter="sensor"
                @value-changed="${this._valueChanged}"
              ></ha-entity-picker>
              
              <ha-entity-picker
                label="Sensor de Luz (opcional)"
                .hass="${this.hass}"
                .value="${plant.light_entity || ''}"
                .configValue="${`${index}_light_entity`}"
                domain-filter="sensor"
                @value-changed="${this._valueChanged}"
              ></ha-entity-picker>
              
              <ha-entity-picker
                label="Sensor de Condutividade (opcional)"
                .hass="${this.hass}"
                .value="${plant.conductivity_entity || ''}"
                .configValue="${`${index}_conductivity_entity`}"
                domain-filter="sensor"
                @value-changed="${this._valueChanged}"
              ></ha-entity-picker>
            </div>
          `)}
          
          <mwc-button
            raised
            .configValue="${'plant_add'}"
            @click="${this._valueChanged}"
          >
            Adicionar Planta
          </mwc-button>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config {
        padding: 16px;
      }
      
      .overall-config {
        margin-bottom: 24px;
      }
      
      ha-formfield {
        display: block;
        margin: 8px 0;
      }
      
      .plants-config {
        border-top: 1px solid var(--divider-color);
        padding-top: 16px;
      }
      
      .plant-config {
        background: rgba(0, 0, 0, 0.05);
        padding: 16px;
        margin-bottom: 16px;
        border-radius: 8px;
      }
      
      .plant-config h4 {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0;
      }
      
      mwc-button {
        margin-top: 8px;
      }
    `;
  }
}

customElements.define('plant-monitor-card-editor', PlantMonitorCardEditor);
