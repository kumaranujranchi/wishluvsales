import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useDialog } from '../contexts/DialogContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Building, Plus, ExternalLink, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Id, Doc } from '../../convex/_generated/dataModel';

export function ProjectsPage() {
  const { profile } = useAuth();
  const dialog = useDialog();
  
  // Convex Hooks
  const projects = useQuery(api.projects.list);
  const addProject = useMutation(api.projects.add);
  const updateProject = useMutation(api.projects.update);
  const removeProject = useMutation(api.projects.remove);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<Id<"projects"> | null>(null);
  
  const isReadOnly = profile?.role === 'director';

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    googleMapsUrl: ''
  });

  const resetForm = () => {
    setFormData({ name: '', address: '', googleMapsUrl: '' });
    setEditingProjectId(null);
  };

  const handleEditProject = (project: Doc<"projects">) => {
    if (isReadOnly) return;
    setEditingProjectId(project._id);
    setFormData({
      name: project.name,
      address: project.address || '',
      googleMapsUrl: project.google_maps_url || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsSubmitting(true);
    try {
      if (editingProjectId) {
        // Update existing project
        await updateProject({
          id: editingProjectId,
          name: formData.name,
          address: formData.address,
          google_maps_url: formData.googleMapsUrl || undefined,
          updated_at: new Date().toISOString()
        });
        await dialog.alert('Project updated successfully!', { variant: 'success', title: 'Success' });
      } else {
        // Create new project
        await addProject({
          name: formData.name,
          address: formData.address,
          google_maps_url: formData.googleMapsUrl || undefined,
          is_active: true,
          site_photos: [], 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        await dialog.alert('Project added successfully!', { variant: 'success', title: 'Success' });
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving project:', error);
      await dialog.alert('Failed to save project', { variant: 'danger', title: 'Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"projects">) => {
    if (isReadOnly) return;
    const confirmed = await dialog.confirm('Are you sure you want to delete this project?', {
      variant: 'danger',
      confirmText: 'Delete Project',
      title: 'Delete Project'
    });

    if (!confirmed) return;

    try {
      await removeProject({ id });
      await dialog.alert('Project deleted.', { variant: 'success', title: 'Deleted' });
    } catch (error) {
      console.error('Error deleting project:', error);
      await dialog.alert('Failed to delete project. It might be referenced by other records.', { variant: 'danger', title: 'Error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1 md:mb-2">Projects</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">Manage property projects and listings</p>
        </div>
        {!isReadOnly && (
          <Button variant="primary" onClick={() => { resetForm(); setIsModalOpen(true); }} className="hidden md:flex">
            <Plus size={18} className="mr-2" />
            Add Project
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building size={20} />
            <CardTitle>All Projects</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!projects ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1673FF] border-t-transparent"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  {!isReadOnly && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project._id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.address || '-'}</TableCell>
                    <TableCell>
                      {project.google_maps_url ? (
                        <a
                          href={project.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1673FF] hover:underline flex items-center gap-1"
                        >
                          View Map <ExternalLink size={14} />
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.is_active ? 'success' : 'default'}>
                        {project.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {!isReadOnly && (
                        <TableCell>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditProject(project)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10">
                            <Pencil size={16} />
                            </Button>
                            <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10"
                            onClick={() => handleDelete(project._id)}
                            >
                            <Trash2 size={16} />
                            </Button>
                        </div>
                        </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button for Mobile */}
      {!isReadOnly && (
        <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="md:hidden fixed bottom-24 right-4 w-12 h-12 bg-[#1673FF] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 active:scale-95 transition-all z-30"
        >
            <Plus size={24} />
        </button>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProjectId ? "Edit Project" : "Add New Project"}
      >
        <form onSubmit={handleSaveProject} className="space-y-6">
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            placeholder="e.g. Sunrise Apartments"
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Property location details..."
          />
          <Input
            label="Google Maps URL"
            value={formData.googleMapsUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, googleMapsUrl: e.target.value }))}
            placeholder="https://maps.google.com/..."
          />
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              {editingProjectId ? (
                <>
                  <span className="hidden md:inline">Update Project</span>
                  <span className="md:hidden">Update</span>
                </>
              ) : (
                <>
                  <span className="hidden md:inline">Create Project</span>
                  <span className="md:hidden">Create</span>
                </>
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
