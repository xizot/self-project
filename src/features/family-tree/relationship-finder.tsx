'use client';

import { FamilyMember } from '@/src/lib/types';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/components/ui/select';
import { ArrowLeftRight, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { KinshipResult, Region } from './vietnamese-kinship';

interface RelationshipFinderProps {
  members: FamilyMember[];
  onResult?: (
    result: KinshipResult & {
      pathWithNames: Array<{ id: number; name: string }>;
    }
  ) => void;
  onSelectPair?: (personAId: number, personBId: number) => void;
}

interface FindResult extends KinshipResult {
  pathWithNames: Array<{ id: number; name: string }>;
  personA: FamilyMember;
  personB: FamilyMember;
}

export default function RelationshipFinder({
  members,
  onResult,
  onSelectPair,
}: RelationshipFinderProps) {
  const [personAId, setPersonAId] = useState<string>('');
  const [personBId, setPersonBId] = useState<string>('');
  const [region, setRegion] = useState<Region>('bac');
  const [result, setResult] = useState<FindResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFind = async () => {
    if (!personAId || !personBId) return;
    if (personAId === personBId) {
      setError('Vui lòng chọn hai người khác nhau');
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(
        `/api/family-tree/relationships/find?personA=${personAId}&personB=${personBId}&region=${region}`
      );
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        onResult?.(data);
        onSelectPair?.(parseInt(personAId), parseInt(personBId));
      } else {
        const data = await res.json();
        setError(data.error || 'Không tìm thấy quan hệ');
      }
    } catch {
      setError('Lỗi khi tìm quan hệ');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const tmp = personAId;
    setPersonAId(personBId);
    setPersonBId(tmp);
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Tìm quan hệ</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Vùng miền
          </label>
          <Select
            value={region}
            onValueChange={(v) => {
              setRegion(v as Region);
              setResult(null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bac">🏛️ Miền Bắc</SelectItem>
              <SelectItem value="trung">⛩️ Miền Trung</SelectItem>
              <SelectItem value="nam">🌴 Miền Nam</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Người A
          </label>
          <Select value={personAId} onValueChange={setPersonAId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn người A" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.gender === 'male' ? '👨' : '👩'} {m.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSwap}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Người B
          </label>
          <Select value={personBId} onValueChange={setPersonBId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn người B" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.gender === 'male' ? '👨' : '👩'} {m.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full"
          onClick={handleFind}
          disabled={!personAId || !personBId || loading}
        >
          {loading ? 'Đang tìm...' : 'Tìm quan hệ'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{result.description}</span>
          </div>

          {/* A calls B */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30">
              <span className="text-sm font-medium">
                {result.personA.full_name}
              </span>
              <span className="text-xs text-muted-foreground">gọi</span>
              <span className="text-sm font-medium">
                {result.personB.full_name}
              </span>
              <span className="text-xs text-muted-foreground">là</span>
              <span className="text-sm font-bold text-primary uppercase">
                {result.aCallsB}
              </span>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-md bg-pink-50 dark:bg-pink-950/30">
              <span className="text-sm font-medium">
                {result.personB.full_name}
              </span>
              <span className="text-xs text-muted-foreground">gọi</span>
              <span className="text-sm font-medium">
                {result.personA.full_name}
              </span>
              <span className="text-xs text-muted-foreground">là</span>
              <span className="text-sm font-bold text-primary uppercase">
                {result.bCallsA}
              </span>
            </div>
          </div>

          {/* Path */}
          {result.pathWithNames && result.pathWithNames.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Đường quan hệ:
              </p>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {result.pathWithNames.map((node, i) => (
                  <span key={node.id} className="flex items-center gap-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full',
                        i === 0 || i === result.pathWithNames.length - 1
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'bg-muted'
                      )}
                    >
                      {node.name}
                    </span>
                    {i < result.pathWithNames.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Side info */}
          {result.side !== 'direct' && result.side !== 'spouse' && (
            <div className="text-xs text-muted-foreground">
              {result.side === 'paternal'
                ? '🏠 Bên nội'
                : result.side === 'maternal'
                  ? '🏡 Bên ngoại'
                  : '💑 Qua hôn nhân'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
