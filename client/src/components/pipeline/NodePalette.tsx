import type { DragEvent } from 'react';
import type { PipelineNodeType, PipelineNodeConfig } from '@mapforge/shared';
import { Database, PencilLine, ShieldCheck, Shuffle, Bell, ArrowDownToLine } from 'lucide-react';
import { usePipelineStore } from '@/stores/pipelineStore';

interface NodeDefinition {
  type: PipelineNodeType;
  label: string;
  description: string;
  color: string;
  icon: typeof Database;
}

const NODE_CATEGORIES: Array<{
  category: string;
  nodes: NodeDefinition[];
}> = [
  {
    category: 'Sources',
    nodes: [
      {
        type: 'bigquery_source',
        label: 'BigQuery Source',
        description: 'Pull data from BQ table or query',
        color: '#3b82f6',
        icon: Database,
      },
    ],
  },
  {
    category: 'Processing',
    nodes: [
      {
        type: 'enrichment_exercise',
        label: 'Enrichment Exercise',
        description: 'Classify and enrich records',
        color: '#f59e0b',
        icon: PencilLine,
      },
      {
        type: 'transform',
        label: 'Transform',
        description: 'Map, filter, or reshape data',
        color: '#06b6d4',
        icon: Shuffle,
      },
    ],
  },
  {
    category: 'Validation',
    nodes: [
      {
        type: 'validation_gate',
        label: 'Validation Gate',
        description: 'Enforce rules before proceeding',
        color: '#22c55e',
        icon: ShieldCheck,
      },
    ],
  },
  {
    category: 'Outputs',
    nodes: [
      {
        type: 'bigquery_destination',
        label: 'BigQuery Destination',
        description: 'Write results back to BQ',
        color: '#a855f7',
        icon: ArrowDownToLine,
      },
      {
        type: 'notification',
        label: 'Notification',
        description: 'Send alerts on completion',
        color: '#eab308',
        icon: Bell,
      },
    ],
  },
];

function onDragStart(event: DragEvent, node: NodeDefinition) {
  event.dataTransfer.setData('application/pipeline-node-type', node.type);
  event.dataTransfer.setData('application/pipeline-node-label', node.label);
  event.dataTransfer.effectAllowed = 'move';
}

export function NodePalette() {
  const store = usePipelineStore();

  const handleClick = (node: NodeDefinition) => {
    store.addNode({
      id: `node-${Date.now()}`,
      type: node.type,
      label: node.label,
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      config: { nodeType: node.type } as PipelineNodeConfig,
    });
  };

  return (
    <div className="w-56 border-r border-border bg-card/50 overflow-y-auto shrink-0">
      <div className="px-3 pt-3 pb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Node Palette
        </span>
      </div>

      {NODE_CATEGORIES.map(({ category, nodes }) => (
        <div key={category} className="px-2 pb-2">
          <div className="px-1 pt-2.5 pb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {category}
            </span>
          </div>

          <div className="space-y-1">
            {nodes.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node)}
                  onClick={() => handleClick(node)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md border border-border bg-card cursor-grab hover:border-border hover:bg-muted/80 transition-all active:cursor-grabbing group"
                >
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded shrink-0"
                    style={{ backgroundColor: `${node.color}20` }}
                  >
                    <Icon size={14} style={{ color: node.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate group-hover:text-foreground">
                      {node.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate leading-tight">
                      {node.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
