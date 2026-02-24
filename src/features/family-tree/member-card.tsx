'use client';

import { FamilyMember } from '@/src/lib/types';
import { cn } from '@/src/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/shared/components/ui/dropdown-menu';
import {
  Edit2,
  Heart,
  Link2,
  Trash2,
  User,
  UserPlus,
  Users,
} from 'lucide-react';

interface MemberCardProps {
  member: FamilyMember;
  spouse?: FamilyMember | null;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onEdit?: (member: FamilyMember) => void;
  onDelete?: (member: FamilyMember) => void;
  onClick?: (member: FamilyMember) => void;
  onAddParent?: (member: FamilyMember) => void;
  onAddChild?: (member: FamilyMember) => void;
  onAddSpouse?: (member: FamilyMember) => void;
  onLinkRelationship?: (member: FamilyMember) => void;
}

export default function MemberCard({
  member,
  spouse,
  isHighlighted,
  isSelected,
  onEdit,
  onDelete,
  onClick,
  onAddParent,
  onAddChild,
  onAddSpouse,
  onLinkRelationship,
}: MemberCardProps) {
  const birthYear = member.birth_date?.split('-')[0];
  const deathYear = member.death_date?.split('-')[0];
  const yearDisplay = birthYear
    ? deathYear
      ? `${birthYear} - ${deathYear}`
      : member.is_alive
        ? `${birthYear} - nay`
        : birthYear
    : null;

  return (
    <div className="flex items-center gap-1">
      <SingleCard
        member={member}
        yearDisplay={yearDisplay}
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
      {spouse && (
        <>
          <Heart className="h-4 w-4 text-red-500 fill-red-500 shrink-0 mx-0.5" />
          <SingleCard
            member={spouse}
            yearDisplay={
              spouse.birth_date?.split('-')[0]
                ? spouse.death_date?.split('-')[0]
                  ? `${spouse.birth_date.split('-')[0]} - ${spouse.death_date.split('-')[0]}`
                  : spouse.is_alive
                    ? `${spouse.birth_date.split('-')[0]} - nay`
                    : spouse.birth_date.split('-')[0]
                : null
            }
            isHighlighted={isHighlighted}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={onClick}
            onAddParent={onAddParent}
            onAddChild={onAddChild}
            onAddSpouse={onAddSpouse}
            onLinkRelationship={onLinkRelationship}
          />
        </>
      )}
    </div>
  );
}

function SingleCard({
  member,
  yearDisplay,
  isHighlighted,
  isSelected,
  onEdit,
  onDelete,
  onClick,
  onAddParent,
  onAddChild,
  onAddSpouse,
  onLinkRelationship,
}: {
  member: FamilyMember;
  yearDisplay: string | null;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onEdit?: (member: FamilyMember) => void;
  onDelete?: (member: FamilyMember) => void;
  onClick?: (member: FamilyMember) => void;
  onAddParent?: (member: FamilyMember) => void;
  onAddChild?: (member: FamilyMember) => void;
  onAddSpouse?: (member: FamilyMember) => void;
  onLinkRelationship?: (member: FamilyMember) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            'relative group flex flex-col items-center rounded-lg border-2 p-3 w-35 cursor-pointer transition-all hover:shadow-md',
            member.gender === 'male'
              ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40'
              : 'border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-950/40',
            isHighlighted &&
              'ring-2 ring-yellow-400 shadow-lg shadow-yellow-200/50 dark:shadow-yellow-900/30',
            isSelected && 'ring-2 ring-primary shadow-lg',
            !member.is_alive && 'opacity-70'
          )}
          style={{ cursor: 'pointer', zIndex: 10, pointerEvents: 'auto' }}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(member);
          }}
        >
          {/* Avatar */}
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full mb-1',
              member.gender === 'male'
                ? 'bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                : 'bg-pink-200 text-pink-700 dark:bg-pink-800 dark:text-pink-200'
            )}
          >
            <User className="h-5 w-5" />
          </div>

          {/* Name */}
          <span className="text-xs font-semibold text-center leading-tight line-clamp-2">
            {member.full_name}
          </span>

          {/* Year */}
          {yearDisplay && (
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {yearDisplay}
            </span>
          )}

          {/* Deceased indicator */}
          {!member.is_alive && (
            <span className="text-[10px] text-muted-foreground">✝</span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {onAddParent && (
          <DropdownMenuItem onClick={() => onAddParent(member)}>
            <Users className="mr-2 h-4 w-4" />
            Thêm cha/mẹ
          </DropdownMenuItem>
        )}
        {onAddChild && (
          <DropdownMenuItem onClick={() => onAddChild(member)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Thêm con
          </DropdownMenuItem>
        )}
        {onAddSpouse && (
          <DropdownMenuItem onClick={() => onAddSpouse(member)}>
            <Heart className="mr-2 h-4 w-4" />
            Thêm vợ/chồng
          </DropdownMenuItem>
        )}
        {onLinkRelationship && (
          <DropdownMenuItem onClick={() => onLinkRelationship(member)}>
            <Link2 className="mr-2 h-4 w-4" />
            Liên kết quan hệ
          </DropdownMenuItem>
        )}
        {(onAddParent || onAddChild || onAddSpouse || onLinkRelationship) &&
          (onEdit || onDelete) && <DropdownMenuSeparator />}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(member)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Sửa thông tin
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(member)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
