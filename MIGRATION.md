# Migration Guide - User Authentication

## Database Migration

Khi thêm tính năng authentication, database schema đã được cập nhật để thêm:
- `users` table
- `user_id` column vào các bảng: `projects`, `statuses`, `categories`, `tasks`, `notes`

## Nếu bạn đang có database cũ:

### Option 1: Xóa database cũ (Recommended cho development)
```bash
# Xóa file database cũ
rm -rf data/app.db

# Database sẽ được tạo lại tự động khi chạy ứng dụng
```

### Option 2: Migration tự động
Migration sẽ tự động chạy khi ứng dụng khởi động và thêm các cột `user_id` vào các bảng hiện có.

**Lưu ý**: Dữ liệu cũ sẽ có `user_id = NULL`. Bạn cần:
1. Tạo tài khoản user mới
2. Gán dữ liệu cũ cho user đó (nếu cần)

## Sau khi migration:

1. Đăng ký tài khoản mới tại `/register`
2. Đăng nhập tại `/login`
3. Dữ liệu mới sẽ tự động được gán cho user của bạn

