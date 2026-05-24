import { useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { ToolWorkspace } from './components/ToolWorkspace';
import { toolPackages } from './tools/registry';
import type { ClientToolPackage } from './tools/registry';

function App() {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  const activeTool: ClientToolPackage | undefined = activeToolId
    ? toolPackages.find(p => p.meta.id === activeToolId)
    : undefined;

  if (activeToolId && activeTool) {
    return (
      <ToolWorkspace
        title={activeTool.meta.name}
        icon={activeTool.meta.icon}
        onBack={() => setActiveToolId(null)}
      >
        <activeTool.component />
      </ToolWorkspace>
    );
  }

  return <HomeScreen onSelectTool={setActiveToolId} />;
}

export default App;
