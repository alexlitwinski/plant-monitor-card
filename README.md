# Plant Monitor Card

Um card personalizado para o Home Assistant que exibe de maneira bonita e intuitiva o estado dos seus sensores de plantas.

## Funcionalidades

- 🌱 Interface moderna para monitoramento de plantas
- 💧 Indicadores de umidade do solo com códigos de cores
- 🔋 Status de bateria para sensores sem fio
- 🌡️ Temperatura ambiente da planta
- 🔆 Suporte para sensores de luz (opcional)
- ⚡ Suporte para sensores de condutividade (opcional)
- 📊 Gráficos de histórico (em desenvolvimento)
- 📱 Design responsivo e adaptável
- ⚙️ Editor visual de configuração
- 🚰 Notificação visual quando a planta precisa de água

## Instalação

### HACS (recomendado)

1. Certifique-se de que o [HACS](https://hacs.xyz/) está instalado
2. Adicione este repositório como um repositório personalizado no HACS:
   - URL: `https://github.com/SEU_USUARIO/plant-monitor-card`
   - Categoria: `Lovelace`
3. Procure por "Plant Monitor Card" no HACS
4. Instale o card
5. Reinicie o Home Assistant

### Instalação Manual

1. Baixe o arquivo `plant-monitor-card.js` deste repositório
2. Faça upload para o diretório `www` do seu Home Assistant
3. Adicione o recurso em sua configuração do Lovelace:
   ```yaml
   resources:
     - url: /local/plant-monitor-card.js
       type: module
   ```
4. Reinicie o Home Assistant

## Uso

Adicione o card ao seu dashboard do Lovelace:

```yaml
type: custom:plant-monitor-card
title: Minhas Plantas
show_chart: true
show_stats: true
plants:
  - name: Suculenta
    location: Sala de Estar
    image: /local/images/plants/planta1.jpg
    moisture_entity: sensor.planta_sala_umidade
    temperature_entity: sensor.planta_sala_temperatura
    battery_entity: sensor.planta_sala_bateria
  - name: Espada de São Jorge
    location: Quarto
    moisture_entity: sensor.planta_quarto_umidade
    temperature_entity: sensor.planta_quarto_temperatura
    battery_entity: sensor.planta_quarto_bateria
```

## Configuração

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `title` | string | `Minhas Plantas` | Título principal do card |
| `show_chart` | boolean | `true` | Exibir gráfico de histórico |
| `show_stats` | boolean | `true` | Exibir estatísticas |
| `plants` | array | obrigatório | Lista de plantas para monitorar |

### Configuração de cada planta

| Opção | Tipo | Obrigatório | Descrição |
|-------|------|------------|-----------|
| `name` | string | Sim | Nome da planta |
| `location` | string | Não | Localização da planta |
| `image` | string | Não | URL da imagem da planta |
| `moisture_entity` | string | Sim | ID da entidade de umidade |
| `temperature_entity` | string | Não | ID da entidade de temperatura |
| `battery_entity` | string | Não | ID da entidade de bateria |
| `light_entity` | string | Não | ID da entidade de luz |
| `conductivity_entity` | string | Não | ID da entidade de condutividade |

## Compatibilidade

Este card é compatível com sensores de plantas de várias marcas:
- Xiaomi Mi Flora / HHCC Plant Sensors
- DIY ESPHome
- Sensores genéricos

## Solução de Problemas

Se o card não aparecer:
1. Verifique se o arquivo JS foi carregado corretamente (inspecione erros no console do navegador)
2. Confirme que as entidades especificadas existem no Home Assistant
3. Verifique se o nome do tipo `custom:plant-monitor-card` está correto na configuração

## Licença

Este projeto está licenciado sob a Licença MIT.
