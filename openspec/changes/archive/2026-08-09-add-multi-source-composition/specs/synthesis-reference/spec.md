## MODIFIED Requirements

### Requirement: Presupuesto de coste declarado

La referencia SHALL declarar un presupuesto de coste de cómputo para la reproducción: un límite para el ambiente más exigente del catálogo y un límite para la mezcla simultánea de varias capas.

La referencia SHALL declarar además un presupuesto propio del motor de composición, medido sobre la escena más exigente que ese motor admite —varios `Source` simultáneos con `Environment`, `Occlusion` y `Modifiers` activos—, junto con el límite de capas simultáneas que de él se deriva. Ese presupuesto MUST NOT heredarse del límite del motor de ambientes sin volver a medirlo: los dos motores tienen costes distintos por componente.

El coste real SHALL medirse y registrarse, y una capa cuyo coste exceda su presupuesto MUST NOT incorporarse sin revisar el presupuesto de forma explícita.

#### Scenario: Medición del ambiente más exigente

- **WHEN** se mide el coste de cómputo del ambiente más exigente durante reproducción sostenida
- **THEN** el valor medido queda registrado y se encuentra dentro del presupuesto declarado

#### Scenario: Capa que excede el presupuesto

- **WHEN** una capa nueva hace que la mezcla exceda el presupuesto declarado
- **THEN** la capa no se incorpora hasta que se optimice o el presupuesto se revise de forma explícita y documentada

#### Scenario: Medición de la escena más exigente del motor de composición

- **WHEN** se mide el coste de la escena más exigente que el motor de composición admite, con varios `Source` simultáneos y los tres componentes moduladores activos
- **THEN** el valor medido queda registrado en la referencia junto con el límite de capas simultáneas que de él se deriva, expresado en capas y no en número de `Source`
