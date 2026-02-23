'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Project } from '@/lib/types';
import ProjectForm from '@/src/features/projects/project-form';
import { Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ProjectsManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    fetchProjects();
    setEditingProject(null);
    setProjectFormOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa project này?')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setProjectFormOpen(true);
  };

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Quản lý Projects</h2>
          <p className="text-muted-foreground">
            Quản lý các projects/boards dùng chung cho todo và kanban
          </p>
        </div>
        <ProjectForm
          onSuccess={handleFormSuccess}
          editingProject={editingProject}
          open={projectFormOpen}
          onOpenChange={(isOpen) => {
            setProjectFormOpen(isOpen);
            if (!isOpen) {
              setEditingProject(null);
            }
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {project.color && (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
                  <CardTitle>{project.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(project)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {project.description || 'Không có mô tả'}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Chưa có project nào. Hãy thêm project mới!
        </div>
      )}
    </div>
  );
}
