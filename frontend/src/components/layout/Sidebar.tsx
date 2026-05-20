import { EditorBar } from "../panels/EditorBar";
import { ModelTree } from "../panels/ModelTree";
import { AnalysisSettings } from "../panels/AnalysisSettings";

export function Sidebar() {
  return (
    <div className="w-72 border-r border-border bg-bg-panel flex flex-col overflow-hidden">
      <EditorBar />
      <div className="flex-1 overflow-auto">
        <ModelTree />
      </div>
      <div className="border-t border-border">
        <AnalysisSettings />
      </div>
    </div>
  );
}
