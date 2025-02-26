# Plant Monitor Card

Um card personalizado elegante para monitorar sensores de plantas no Home Assistant.

## Características

- 🌱 Interface moderna para monitoramento de plantas
- 💧 Indicadores de umidade do solo com códigos de cores
- 🔋 Status de bateria para sensores sem fio
- 🌡️ Temperatura ambiente da planta
- 📊 Estatísticas e resumo visual do estado das plantas

## Uso

```yaml
type: custom:plant-monitor-card
title: Minhas Plantas
plants:
  - name: Suculenta
    location: Sala de Estar
    moisture_entity: sensor.planta_sala_umidade
    temperature_entity: sensor.planta_sala_temperatura
    battery_entity: sensor.planta_sala_bateria
```

[Documentação completa no README](https://github.com/SEU_USUARIO/plant-monitor-card)
