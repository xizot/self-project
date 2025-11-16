# Ứng dụng Quản lý Cá nhân

Ứng dụng web quản lý công việc cá nhân với các tính năng:

- ✅ Todo List với phân loại và ưu tiên
- 📋 Kanban Board với drag & drop
- 📝 Ghi chú với tìm kiếm và phân loại

## Công nghệ sử dụng

- **Frontend/Backend**: Next.js 16 với App Router
- **UI**: shadcnUI + Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Cache**: Redis (ioredis)
- **Drag & Drop**: @dnd-kit

## Cài đặt và chạy

### Phát triển (Development)

1. Cài đặt dependencies:

```bash
npm install
```

2. Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

3. Chạy Redis (nếu chưa có):

```bash
# Sử dụng Docker
docker run -d -p 6379:6379 redis:7-alpine

# Hoặc cài đặt Redis trên máy local
```

4. Chạy ứng dụng:

```bash
npm run dev
```

5. Mở trình duyệt tại: http://localhost:3000

### Production với Docker Compose

1. Build và chạy tất cả services:

```bash
docker-compose up -d
```

2. Xem logs:

```bash
docker-compose logs -f app
```

3. Dừng services:

```bash
docker-compose down
```

4. Dừng và xóa volumes (xóa dữ liệu):

```bash
docker-compose down -v
```

## Cấu trúc dự án

```
├── app/
│   ├── api/              # API routes
│   │   ├── todos/        # Todo endpoints
│   │   ├── kanban/       # Kanban endpoints
│   │   └── notes/        # Notes endpoints
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── ui/               # shadcnUI components
│   ├── todo-list.tsx     # Todo list component
│   ├── kanban-board.tsx  # Kanban board component
│   └── notes.tsx         # Notes component
├── lib/
│   ├── db.ts             # SQLite database setup
│   ├── redis.ts          # Redis client
│   └── types.ts          # TypeScript types
├── data/                 # SQLite database (tự động tạo)
├── docker-compose.yml    # Docker compose configuration
└── Dockerfile            # Docker image configuration
```

## Tính năng

### Todo List

- Tạo, chỉnh sửa, xóa todo
- Phân loại theo trạng thái (Todo, Đang làm, Hoàn thành)
- Đặt ưu tiên (Thấp, Trung bình, Cao)
- Thêm danh mục và hạn chót
- Lọc theo trạng thái và danh mục

### Kanban Board

- Tạo nhiều boards
- Drag & drop cards giữa các cột
- Quản lý cards với ưu tiên
- Tạo, chỉnh sửa, xóa cards

### Ghi chú

- Tạo và quản lý ghi chú
- Thêm danh mục và tags
- Tìm kiếm theo nội dung
- Lọc theo danh mục

## API Endpoints

### Todos

- `GET /api/todos` - Lấy danh sách todos
- `POST /api/todos` - Tạo todo mới
- `GET /api/todos/[id]` - Lấy todo theo ID
- `PATCH /api/todos/[id]` - Cập nhật todo
- `DELETE /api/todos/[id]` - Xóa todo

### Kanban

- `GET /api/kanban/boards` - Lấy danh sách boards
- `POST /api/kanban/boards` - Tạo board mới
- `GET /api/kanban/cards?board_id=X` - Lấy cards của board
- `POST /api/kanban/cards` - Tạo card mới
- `PATCH /api/kanban/cards/[id]` - Cập nhật card
- `DELETE /api/kanban/cards/[id]` - Xóa card
- `POST /api/kanban/cards/move` - Di chuyển card

### Notes

- `GET /api/notes` - Lấy danh sách notes
- `POST /api/notes` - Tạo note mới
- `PATCH /api/notes/[id]` - Cập nhật note
- `DELETE /api/notes/[id]` - Xóa note

## Lưu ý

- Database SQLite được lưu trong thư mục `data/`
- Redis được sử dụng để cache dữ liệu
- Dữ liệu sẽ được lưu trong Docker volumes khi chạy với Docker Compose

## License

MIT
