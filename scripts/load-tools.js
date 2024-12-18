
const toolFiles = {
  'Base': 'https://rahulkirangaddam.is-a.dev/HarmonyHub/tools/base.yaml',
  'Integration': 'https://rahulkirangaddam.is-a.dev/HarmonyHub/tools/integration.yaml'
};

export async function loadTools() {
  const tools = {};
  
  for (const [category, path] of Object.entries(toolFiles)) {
    try {
      const response = await fetch(path);
      const yamlText = await response.text();
      const toolData = jsyaml.load(yamlText);
      
      tools[category] = [];
      for (const [name, config] of Object.entries(toolData)) {
        tools[category].push({
          id: config.id,
          type: config.type,
          description: config.description,
          svg: config.svg,
          category: config.category,
          properties: config.properties,
          headers: config.type === "harmonyhub-integration" ? config.headers : null,
          workflow: config.type === "harmonyhub-integration" ? config.workflow : null
        });
      }
    } catch (error) {
      console.error(`Error loading tools from ${path}:`, error);
    }
  }
  
  return tools;
}