import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { toolPackages } from './tools/registry';
import type { ClientToolPackage } from './tools/registry';

function App() {
  const [activeToolId, setActiveToolId] = useState(toolPackages[0].meta.id);
  const activeTool: ClientToolPackage | undefined = toolPackages.find(
    (p) => p.meta.id === activeToolId
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeToolId={activeToolId} onSelectTool={setActiveToolId} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {activeTool ? (
          <activeTool.component />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            未找到工具包
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
