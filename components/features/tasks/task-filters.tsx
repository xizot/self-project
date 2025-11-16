'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Project, Status, Category } from '@/lib/types';
import { Search, X } from 'lucide-react';

export interface TaskFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  category: string | 'all';
  project: number | 'all';
  status: number | 'all';
  sortBy: 'created_at' | 'due_date' | 'title' | 'priority' | 'position';
  sortOrder: 'asc' | 'desc';
}

interface TaskFiltersProps {
  projects: Project[];
  statuses: Status[];
  categories: Category[];
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  projectId?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskFiltersComponent({
  projects,
  statuses,
  categories,
  filters,
  onFiltersChange,
  projectId,
  open,
  onOpenChange,
}: TaskFiltersProps) {
  const updateFilter = (key: keyof TaskFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      search: '',
      dateFrom: '',
      dateTo: '',
      category: 'all',
      project: 'all',
      status: 'all',
      sortBy: 'position',
      sortOrder: 'asc',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bộ lọc & Sắp xếp</DialogTitle>
          <DialogDescription>
            Lọc và sắp xếp tasks theo các tiêu chí
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Search */}
          <div>
            <Label htmlFor="search" className="mb-1">
              Tìm kiếm theo tên
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Nhập tên task..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>{' '}
          {/* Project */}
          {!projectId && (
            <div>
              <Label htmlFor="project" className="mb-1">
                Project
              </Label>
              <Select
                value={
                  filters.project === 'all' ? 'all' : filters.project.toString()
                }
                onValueChange={(value) =>
                  updateFilter(
                    'project',
                    value === 'all' ? 'all' : parseInt(value)
                  )
                }
              >
                <SelectTrigger id="project" className="w-full">
                  <SelectValue placeholder="Tất cả projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div>
              <Label htmlFor="dateFrom" className="mb-1">
                Từ ngày
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo" className="mb-1">
                Đến ngày
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <Label htmlFor="category" className="mb-1">
                Danh mục
              </Label>
              <Select
                value={filters.category}
                onValueChange={(value) => updateFilter('category', value)}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Tất cả danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="mb-1">
                Trạng thái
              </Label>
              <Select
                value={
                  filters.status === 'all' ? 'all' : filters.status.toString()
                }
                onValueChange={(value) =>
                  updateFilter(
                    'status',
                    value === 'all' ? 'all' : parseInt(value)
                  )
                }
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id.toString()}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Sort */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <Label htmlFor="sortBy" className="mb-1">
                Sắp xếp theo
              </Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) =>
                  updateFilter('sortBy', value as TaskFilters['sortBy'])
                }
              >
                <SelectTrigger id="sortBy" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Vị trí</SelectItem>
                  <SelectItem value="created_at">Ngày tạo</SelectItem>
                  <SelectItem value="due_date">Hạn chót</SelectItem>
                  <SelectItem value="title">Tên</SelectItem>
                  <SelectItem value="priority">Độ ưu tiên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sortOrder" className="mb-1">
                Thứ tự
              </Label>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) =>
                  updateFilter('sortOrder', value as 'asc' | 'desc')
                }
              >
                <SelectTrigger id="sortOrder" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Tăng dần</SelectItem>
                  <SelectItem value="desc">Giảm dần</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetFilters}>
            <X className="h-4 w-4 mr-2" />
            Xóa bộ lọc
          </Button>
          <Button onClick={() => onOpenChange(false)}>Áp dụng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
