# HƯỚNG DẪN CÀI ĐẶT WORDPRESS PLUGIN

## Cách 1: Upload File Plugin

1. Vào WordPress Admin
2. Plugins → Add New → Upload Plugin
3. Chọn file `can-giuoc-food-core-v2.php`
4. Click "Install Now" → "Activate"

## Cách 2: Copy Code Trực Tiếp

1. Vào WordPress Admin
2. Plugins → Plugin File Editor
3. Chọn plugin "Cần Giuộc Food Core" (nếu đã có)
4. Hoặc tạo file mới: `/wp-content/plugins/can-giuoc-food-core/can-giuoc-food-core.php`
5. Copy toàn bộ code từ file `can-giuoc-food-core-v2.php` vào đây
6. Click "Update File"
7. Activate plugin

## Kiểm Tra Sau Khi Cài

✅ Vào "Quán Ăn" → Phải thấy menu "Loại hình ẩm thực" và "Khu vực"
✅ Tạo/Sửa 1 quán → Phải thấy section checkbox màu xanh lá
✅ Tick "Có máy lạnh" → Save → Kiểm tra lại phải còn tick
✅ Vào REST API: `https://your-site.com/wp-json/wp/v2/quan_an`
   - Phải thấy field `has_ac: true` hoặc `false`
   - Phải thấy `featured_media_url` với link ảnh

## Taxonomy Tự Động Tạo

Sau khi activate, plugin sẽ tự động tạo các term:

**Loại hình ẩm thực (food_type):**
- Cơm/Món nước
- Phở
- Bún
- Hải sản
- Đồ ăn vặt
- Trà sữa/Cafe
- Món chay
- Quán nhậu
- Đặc sản địa phương

**Khu vực (khu_vuc):**
- Thị trấn Cần Giuộc
- Phước Lâm
- Trường Bình
- Long Thượng
- Phước Lý
- Mỹ Lộc

## Lưu Ý Quan Trọng

⚠️ **Backup trước khi cập nhật:** Nếu đã có plugin cũ, backup database trước
⚠️ **Version:** Plugin này là v2.0, tương thích ngược với v1.0
⚠️ **REST API:** Đảm bảo WordPress đã bật REST API (mặc định là bật)

## Troubleshooting

**Lỗi: Taxonomy không hiện**
→ Vào Settings → Permalinks → Click "Save Changes" (flush rewrite rules)

**Lỗi: REST API trả về 404**
→ Kiểm tra .htaccess, đảm bảo mod_rewrite đã bật

**Lỗi: Checkbox không lưu**
→ Kiểm tra quyền user, phải là Editor hoặc Admin

## File Code Plugin

📄 **Vị trí:** `D:\Web-Am-Thuc-Can-Giuoc\web\wordpress-plugin\can-giuoc-food-core-v2.php`

Copy toàn bộ code từ file này vào WordPress!
