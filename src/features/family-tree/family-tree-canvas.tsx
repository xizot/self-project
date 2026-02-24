'use client';

import { FamilyMember, FamilyRelationship } from '@/src/lib/types';
import { Button } from '@/src/shared/components/ui/button';
import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeTypes,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import MemberCard from './member-card';
import { buildFamilyTree } from './vietnamese-kinship';

interface FamilyTreeCanvasProps {
  members: FamilyMember[];
  relationships: FamilyRelationship[];
  highlightedIds?: Set<number>;
  selectedIds?: Set<number>;
  onEditMember?: (member: FamilyMember) => void;
  onDeleteMember?: (member: FamilyMember) => void;
  onClickMember?: (member: FamilyMember) => void;
  onAddParent?: (member: FamilyMember) => void;
  onAddChild?: (member: FamilyMember) => void;
  onAddSpouse?: (member: FamilyMember) => void;
  onLinkRelationship?: (member: FamilyMember) => void;
  onAddMember?: () => void;
}

const NODE_WIDTH = 160;
const NODE_WIDTH_COUPLE = 320;
const NODE_HEIGHT = 120;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50 });

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: node.data.isCouple ? NODE_WIDTH_COUPLE : NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const w = node.data.isCouple ? NODE_WIDTH_COUPLE : NODE_WIDTH;
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function FamilyMemberNode({ data }: { data: Record<string, unknown> }) {
  const member = data.member as FamilyMember;
  const spouse = data.spouse as FamilyMember | null;
  const isHighlighted = data.isHighlighted as boolean;
  const isSelected = data.isSelected as boolean;
  const onEdit = data.onEdit as ((m: FamilyMember) => void) | undefined;
  const onDelete = data.onDelete as ((m: FamilyMember) => void) | undefined;
  const onClick = data.onClick as ((m: FamilyMember) => void) | undefined;
  const onAddParent = data.onAddParent as
    | ((m: FamilyMember) => void)
    | undefined;
  const onAddChild = data.onAddChild as ((m: FamilyMember) => void) | undefined;
  const onAddSpouse = data.onAddSpouse as
    | ((m: FamilyMember) => void)
    | undefined;
  const onLinkRelationship = data.onLinkRelationship as
    | ((m: FamilyMember) => void)
    | undefined;

  return (
    <div
      data-member-card
      className="relative nopan nodrag nowheel z-[2]"
      style={{ zIndex: 2 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="bg-border! w-2! h-2! min-w-0! min-h-0! border-0!"
      />
      <MemberCard
        member={member}
        spouse={spouse}
        isHighlighted={isHighlighted}
        isSelected={isSelected}
        onEdit={onEdit}
        onDelete={onDelete}
        onClick={onClick}
        onAddParent={onAddParent}
        onAddChild={onAddChild}
        onAddSpouse={onAddSpouse}
        onLinkRelationship={onLinkRelationship}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-border! w-2! h-2! min-w-0! min-h-0! border-0!"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  familyMember: FamilyMemberNode,
};

function FamilyTreeFlow({
  members,
  relationships,
  highlightedIds,
  selectedIds,
  onEditMember,
  onDeleteMember,
  onClickMember,
  onAddParent,
  onAddChild,
  onAddSpouse,
  onLinkRelationship,
  onAddMember,
}: FamilyTreeCanvasProps) {
  const { fitView } = useReactFlow();

  const memberMap = useMemo(() => {
    const map = new Map<number, FamilyMember>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const { nodes, edges } = useMemo(() => {
    if (members.length === 0) return { nodes: [], edges: [] };

    const { roots, childrenMap, spouseMap } = buildFamilyTree(
      members,
      relationships
    );

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const visited = new Set<number>();
    // Map each member ID to the flow node ID they belong to
    const memberNodeId = new Map<number, string>();

    const processNode = (memberId: number) => {
      if (visited.has(memberId)) return;
      visited.add(memberId);

      const member = memberMap.get(memberId);
      if (!member) return;

      const spouseId = spouseMap.get(memberId);
      const spouse = spouseId ? memberMap.get(spouseId) || null : null;
      if (spouseId) visited.add(spouseId);

      const nodeId = `member-${memberId}`;
      memberNodeId.set(memberId, nodeId);
      if (spouseId) memberNodeId.set(spouseId, nodeId);

      flowNodes.push({
        id: nodeId,
        type: 'familyMember',
        position: { x: 0, y: 0 },
        data: {
          member,
          spouse,
          isCouple: !!spouse,
          isHighlighted:
            highlightedIds?.has(memberId) ||
            (spouseId ? highlightedIds?.has(spouseId) : false),
          isSelected:
            selectedIds?.has(memberId) ||
            (spouseId ? selectedIds?.has(spouseId) : false),
          onEdit: onEditMember,
          onDelete: onDeleteMember,
          onClick: onClickMember,
          onAddParent,
          onAddChild,
          onAddSpouse,
          onLinkRelationship,
        },
      });

      // Process children
      const children = childrenMap.get(memberId) || [];
      const spouseChildren = spouseId
        ? (childrenMap.get(spouseId) || []).filter(
            (cId) => !children.includes(cId)
          )
        : [];
      const allChildren = [...children, ...spouseChildren];

      allChildren.forEach((childId) => {
        processNode(childId);
        const childNodeId = memberNodeId.get(childId);
        if (childNodeId && childNodeId !== nodeId) {
          flowEdges.push({
            id: `edge-${memberId}-${childId}`,
            source: nodeId,
            target: childNodeId,
            type: 'smoothstep',
            style: { stroke: 'var(--color-border)', strokeWidth: 2 },
          });
        }
      });
    };

    // Process from roots
    roots.forEach((root) => processNode(root.id));

    // Process any remaining unvisited members (disconnected)
    members.forEach((m) => {
      if (!visited.has(m.id)) {
        processNode(m.id);
      }
    });

    return getLayoutedElements(flowNodes, flowEdges);
  }, [
    members,
    relationships,
    memberMap,
    highlightedIds,
    selectedIds,
    onEditMember,
    onDeleteMember,
    onClickMember,
    onAddParent,
    onAddChild,
    onAddSpouse,
    onLinkRelationship,
  ]);

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    }
  }, [nodes.length, fitView]);

  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground rounded-lg border bg-muted/20">
        <div className="text-center space-y-3">
          <p className="text-lg">Chưa có thành viên nào</p>
          {onAddMember && (
            <Button onClick={onAddMember}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm thành viên
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-125 rounded-lg border bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        noPanClassName="nopan"
        noDragClassName="nodrag"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default function FamilyTreeCanvas(props: FamilyTreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeFlow {...props} />
    </ReactFlowProvider>
  );
}
