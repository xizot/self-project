import NotesComponent from '@/components/features/notes/notes';

export default function NotesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ghi chú</h1>
        <p className="text-muted-foreground">
          Quản lý các ghi chú và ý tưởng của bạn
        </p>
      </div>
      <NotesComponent />
    </div>
  );
}
