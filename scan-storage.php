<?php
/**
 * ============================================================
 * SCAN-STORAGE.PHP — WordPress Server Storage Scanner
 * Dự án: Ăn Uống Cần Giuộc
 * Author: AI Assistant | Version: 1.0
 * ⚠️  READ-ONLY SCRIPT — Không có lệnh xóa hay sửa đổi file.
 * ============================================================
 * HƯỚNG DẪN BẢO MẬT:
 * 1. Upload lên public_html
 * 2. Truy cập qua trình duyệt để quét
 * 3. XÓA FILE NÀY NGAY SAU KHI SỬ DỤNG XONG!
 * ============================================================
 */

// --- Cấu hình bảo mật cơ bản ---
// Bỏ comment dòng dưới và đặt mật khẩu nếu cần bảo vệ script
// define('SCANNER_PASSWORD', 'your_secret_password_here');

if (defined('SCANNER_PASSWORD')) {
    $entered_pass = $_GET['pass'] ?? '';
    if ($entered_pass !== SCANNER_PASSWORD) {
        die('<h2 style="font-family:sans-serif;color:red;text-align:center;margin-top:100px;">🔒 Truy cập bị từ chối. Thêm ?pass=YOUR_PASSWORD vào URL.</h2>');
    }
}

// --- Tăng giới hạn thực thi ---
@set_time_limit(300);
@ini_set('memory_limit', '256M');

// --- Hàm tiện ích ---
function formatBytes(int $bytes, int $precision = 2): string
{
    if ($bytes <= 0)
        return '0 B';
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $pow = floor(log($bytes, 1024));
    $pow = min($pow, count($units) - 1);
    return round($bytes / (1024 ** $pow), $precision) . ' ' . $units[$pow];
}

function getDirSize(string $path): int
{
    $size = 0;
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS | FilesystemIterator::FOLLOW_SYMLINKS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $size += $file->getSize();
            }
        }
    } catch (Exception $e) {
        // Bỏ qua thư mục không có quyền truy cập
    }
    return $size;
}

// Hàm tạo badge màu theo dung lượng
function sizeBadge(int $bytes): string
{
    $mb = $bytes / 1024 / 1024;
    if ($mb >= 100)
        $color = '#dc2626'; // đỏ
    elseif ($mb >= 20)
        $color = '#ea580c'; // cam
    elseif ($mb >= 5)
        $color = '#d97706'; // vàng
    else
        $color = '#16a34a'; // xanh
    return '<span style="display:inline-block;background:' . $color . ';color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">' . formatBytes($bytes) . '</span>';
}

// --- Xác định thư mục gốc WordPress ---
$root = dirname(__FILE__);
$uploadsPath = $root . '/wp-content/uploads';

// --- Thực hiện quét ---
$scanStartTime = microtime(true);

// ===== PHẦN 1: TOP 20 THƯ MỤC NẶNG NHẤT =====
$dirSizes = [];
try {
    $topLevelDirs = new DirectoryIterator($root);
    foreach ($topLevelDirs as $item) {
        if ($item->isDot() || !$item->isDir())
            continue;
        $dirPath = $item->getPathname();
        $dirSizes[$dirPath] = getDirSize($dirPath);
    }
    // Thêm wp-content subdirs để phân tích sâu hơn
    $wcPath = $root . '/wp-content';
    if (is_dir($wcPath)) {
        foreach (new DirectoryIterator($wcPath) as $item) {
            if ($item->isDot() || !$item->isDir())
                continue;
            $dirSizes[$item->getPathname()] = getDirSize($item->getPathname());
        }
        // Phân tích uploads theo năm/tháng
        if (is_dir($uploadsPath)) {
            foreach (new DirectoryIterator($uploadsPath) as $item) {
                if ($item->isDot() || !$item->isDir() || !is_numeric($item->getFilename()))
                    continue;
                $yearPath = $item->getPathname();
                foreach (new DirectoryIterator($yearPath) as $subItem) {
                    if ($subItem->isDot() || !$subItem->isDir())
                        continue;
                    $dirSizes[$subItem->getPathname()] = getDirSize($subItem->getPathname());
                }
                $dirSizes[$yearPath] = getDirSize($yearPath);
            }
        }
    }
} catch (Exception $e) {
}

arsort($dirSizes);
$topDirs = array_slice($dirSizes, 0, 20, true);

// ===== PHẦN 2: TOP 20 FILE NẶNG NHẤT =====
$targetExtensions = ['zip', 'wpress', 'tar', 'gz', 'sql', 'bak', 'log', 'txt', 'rar', '7z', 'tgz'];
$largeFiles = [];

try {
    $fileIterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS | FilesystemIterator::FOLLOW_SYMLINKS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($fileIterator as $file) {
        if (!$file->isFile())
            continue;
        $fileSize = $file->getSize();
        $ext = strtolower($file->getExtension());
        $fname = $file->getFilename();

        // Săn lùng: file lớn hơn 1MB, hoặc có extension nguy hiểm, hoặc là error_log
        $isDangerous = in_array($ext, $targetExtensions);
        $isErrorLog = ($fname === 'error_log' || $fname === 'debug.log' || str_starts_with($fname, 'error_log'));
        $isLarge = ($fileSize > 1 * 1024 * 1024); // > 1MB

        if ($isLarge || $isDangerous || $isErrorLog) {
            $largeFiles[$file->getPathname()] = $fileSize;
        }
    }
} catch (Exception $e) {
}

arsort($largeFiles);
$topFiles = array_slice($largeFiles, 0, 20, true);

// ===== PHẦN 3: PHÂN TÍCH WP-CONTENT/UPLOADS =====
$uploadsStats = [
    'original_count' => 0,
    'original_size' => 0,
    'resized_count' => 0,
    'resized_size' => 0,
    'other_count' => 0,
    'other_size' => 0,
    'total_size' => 0,
];

// Pattern nhận diện ảnh bị WordPress cắt: filename-WIDTHxHEIGHT.ext
$resizedPattern = '/-\d+x\d+\.(jpg|jpeg|png|gif|webp|avif)$/i';
// Extension ảnh gốc
$imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];

if (is_dir($uploadsPath)) {
    try {
        $uIterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($uploadsPath, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($uIterator as $file) {
            if (!$file->isFile())
                continue;
            $size = $file->getSize();
            $fname = $file->getFilename();
            $ext = strtolower($file->getExtension());
            $uploadsStats['total_size'] += $size;

            if (preg_match($resizedPattern, $fname)) {
                $uploadsStats['resized_count']++;
                $uploadsStats['resized_size'] += $size;
            } elseif (in_array($ext, $imageExts)) {
                $uploadsStats['original_count']++;
                $uploadsStats['original_size'] += $size;
            } else {
                $uploadsStats['other_count']++;
                $uploadsStats['other_size'] += $size;
            }
        }
    } catch (Exception $e) {
    }
}

$scanEndTime = microtime(true);
$scanDuration = round($scanEndTime - $scanStartTime, 2);

// Tổng dung lượng root
$totalRootSize = getDirSize($root);

?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 Server Storage Scanner — Ăn Uống Cần Giuộc</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1100px;
            margin: 0 auto;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%);
            border-radius: 16px;
            padding: 28px 32px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .header-icon {
            font-size: 48px;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 700;
            color: #fff;
        }

        .header p {
            font-size: 13px;
            color: #bfdbfe;
            margin-top: 4px;
        }

        /* Warning */
        .warning-box {
            background: #7f1d1d;
            border: 1px solid #ef4444;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #fecaca;
            display: flex;
            gap: 10px;
            align-items: center;
        }

        /* Stats bar */
        .stats-bar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 14px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 18px 20px;
        }

        .stat-label {
            font-size: 11px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: .05em;
            margin-bottom: 6px;
        }

        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #f8fafc;
        }

        .stat-sub {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
        }

        /* Section */
        .section {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            margin-bottom: 24px;
            overflow: hidden;
        }

        .section-header {
            padding: 16px 20px;
            border-bottom: 1px solid #334155;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-header h2 {
            font-size: 16px;
            font-weight: 600;
            color: #f1f5f9;
        }

        .section-header .badge {
            font-size: 11px;
            background: #334155;
            color: #94a3b8;
            padding: 2px 8px;
            border-radius: 99px;
        }

        /* Table */
        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background: #0f172a;
            color: #64748b;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .05em;
            padding: 10px 16px;
            text-align: left;
        }

        td {
            padding: 10px 16px;
            font-size: 13px;
            border-bottom: 1px solid #0f172a;
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: #263348;
        }

        .rank {
            color: #64748b;
            font-weight: 700;
            font-size: 12px;
            width: 36px;
        }

        .rank-top {
            color: #f59e0b;
        }

        .path-cell {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #93c5fd;
            word-break: break-all;
        }

        .path-root {
            color: #64748b;
        }

        /* File type badges */
        .ftype {
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            margin-left: 6px;
            text-transform: uppercase;
        }

        .ftype-zip,
        .ftype-wpress,
        .ftype-rar,
        .ftype-7z {
            background: #7c3aed;
            color: #fff;
        }

        .ftype-tar,
        .ftype-gz,
        .ftype-tgz {
            background: #0e7490;
            color: #fff;
        }

        .ftype-sql,
        .ftype-bak {
            background: #b45309;
            color: #fff;
        }

        .ftype-log,
        .ftype-txt {
            background: #374151;
            color: #d1d5db;
        }

        /* Progress bar */
        .progress-wrap {
            background: #0f172a;
            border-radius: 99px;
            height: 8px;
            overflow: hidden;
            margin-top: 4px;
        }

        .progress-bar {
            height: 100%;
            border-radius: 99px;
        }

        /* Uploads analysis */
        .uploads-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            padding: 20px;
        }

        .upload-card {
            border-radius: 10px;
            padding: 20px;
            border: 1px solid #334155;
        }

        .upload-card.original {
            border-color: #2563eb;
            background: rgba(37, 99, 235, 0.08);
        }

        .upload-card.resized {
            border-color: #dc2626;
            background: rgba(220, 38, 38, 0.08);
        }

        .upload-card.other {
            border-color: #475569;
            background: rgba(71, 85, 105, 0.08);
        }

        .upload-card .uc-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: .05em;
            color: #94a3b8;
            margin-bottom: 8px;
        }

        .upload-card .uc-count {
            font-size: 32px;
            font-weight: 700;
            color: #f8fafc;
        }

        .upload-card .uc-size {
            font-size: 13px;
            color: #94a3b8;
            margin-top: 4px;
        }

        .upload-card.original .uc-count {
            color: #60a5fa;
        }

        .upload-card.resized .uc-count {
            color: #f87171;
        }

        /* Footer */
        .footer {
            text-align: center;
            color: #475569;
            font-size: 12px;
            padding: 24px 0;
        }

        .footer strong {
            color: #dc2626;
        }
    </style>
</head>

<body>
    <div class="container">

        <!-- Header -->
        <div class="header">
            <div class="header-icon">🔍</div>
            <div>
                <h1>Server Storage Scanner</h1>
                <p>Ăn Uống Cần Giuộc &nbsp;·&nbsp; Quét xong trong <strong style="color:#fde68a">
                        <?= $scanDuration ?>s
                    </strong> &nbsp;·&nbsp; Thư mục gốc: <code
                        style="font-size:11px;color:#bfdbfe"><?= htmlspecialchars($root) ?></code></p>
            </div>
        </div>

        <!-- Warning -->
        <div class="warning-box">
            <span style="font-size:20px">⚠️</span>
            <div><strong>CẢNH BÁO BẢO MẬT:</strong> Script này chỉ dùng để chẩn đoán. Hãy <strong>XÓA FILE NÀY
                    NGAY</strong> sau khi phân tích xong để tránh lộ thông tin server!</div>
        </div>

        <!-- Tổng quan -->
        <div class="stats-bar">
            <div class="stat-card">
                <div class="stat-label">📦 Tổng dung lượng</div>
                <div class="stat-value">
                    <?= formatBytes($totalRootSize) ?>
                </div>
                <div class="stat-sub">Toàn bộ public_html</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">🖼️ Thư mục Uploads</div>
                <div class="stat-value">
                    <?= formatBytes($uploadsStats['total_size']) ?>
                </div>
                <div class="stat-sub">
                    <?= number_format($uploadsStats['original_count'] + $uploadsStats['resized_count'] + $uploadsStats['other_count']) ?>
                    files
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">✂️ Ảnh bị cắt (resize)</div>
                <div class="stat-value" style="color:#f87171">
                    <?= formatBytes($uploadsStats['resized_size']) ?>
                </div>
                <div class="stat-sub">
                    <?= number_format($uploadsStats['resized_count']) ?> thumbnails tự sinh
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">⏱️ Thời gian quét</div>
                <div class="stat-value">
                    <?= $scanDuration ?>s
                </div>
                <div class="stat-sub">
                    <?= date('d/m/Y H:i:s') ?>
                </div>
            </div>
        </div>

        <!-- SECTION 1: TOP DIRECTORIES -->
        <div class="section">
            <div class="section-header">
                <span style="font-size:20px">📁</span>
                <h2>TOP 20 Thư Mục Nặng Nhất</h2>
                <span class="badge">Sorted by size DESC</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Đường dẫn thư mục</th>
                        <th style="text-align:right;width:130px">Dung lượng</th>
                        <th style="width:200px">Biểu đồ</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $maxDirSize = max(array_values($topDirs) ?: [1]);
                    $i = 1;
                    foreach ($topDirs as $path => $size):
                        $relPath = str_replace($root, '', $path);
                        $pct = round(($size / $maxDirSize) * 100);
                        $rankClass = $i <= 3 ? 'rank rank-top' : 'rank';
                        $colors = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#16a34a'];
                        $barColor = $colors[min($i - 1, 4)];
                        ?>
                        <tr>
                            <td class="<?= $rankClass ?>">
                                <?= $i++ ?>
                            </td>
                            <td class="path-cell">
                                <span class="path-root">
                                    <?= htmlspecialchars($root) ?>
                                </span>
                                <?= htmlspecialchars($relPath) ?>
                            </td>
                            <td style="text-align:right">
                                <?= sizeBadge($size) ?>
                            </td>
                            <td>
                                <div class="progress-wrap">
                                    <div class="progress-bar" style="width:<?= $pct ?>%;background:<?= $barColor ?>"></div>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- SECTION 2: TOP FILES -->
        <div class="section">
            <div class="section-header">
                <span style="font-size:20px">🎯</span>
                <h2>TOP 20 File Đáng Ngờ / Nặng Nhất</h2>
                <span class="badge">.zip .wpress .tar .gz .sql .log &gt; 1MB</span>
            </div>
            <?php if (empty($topFiles)): ?>
                <p style="padding:24px;color:#64748b;text-align:center">✅ Không tìm thấy file đáng ngờ lớn hơn 1MB. Tốt!</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Tên file & Đường dẫn</th>
                            <th style="text-align:right;width:130px">Dung lượng</th>
                            <th style="width:200px">Biểu đồ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $maxFileSize = max(array_values($topFiles) ?: [1]);
                        $i = 1;
                        foreach ($topFiles as $path => $size):
                            $fname = basename($path);
                            $ext = strtolower(pathinfo($fname, PATHINFO_EXTENSION));
                            $relPath = str_replace($root, '', dirname($path));
                            $pct = round(($size / $maxFileSize) * 100);
                            $rankClass = $i <= 3 ? 'rank rank-top' : 'rank';
                            $isErrorLog = ($fname === 'error_log' || str_starts_with($fname, 'error_log'));
                            ?>
                            <tr>
                                <td class="<?= $rankClass ?>">
                                    <?= $i++ ?>
                                </td>
                                <td class="path-cell">
                                    <strong style="color:#f1f5f9;font-family:sans-serif">
                                        <?= htmlspecialchars($fname) ?>
                                    </strong>
                                    <?php if (!empty($ext)): ?>
                                        <span class="ftype ftype-<?= $ext ?>">
                                            <?= htmlspecialchars($ext) ?>
                                        </span>
                                    <?php endif; ?>
                                    <?php if ($isErrorLog): ?>
                                        <span class="ftype" style="background:#b91c1c">ERROR LOG</span>
                                    <?php endif; ?>
                                    <br>
                                    <span class="path-root">
                                        <?= htmlspecialchars($root . $relPath) ?>/
                                    </span>
                                </td>
                                <td style="text-align:right">
                                    <?= sizeBadge($size) ?>
                                </td>
                                <td>
                                    <div class="progress-wrap">
                                        <div class="progress-bar" style="width:<?= $pct ?>%;background:#dc2626"></div>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <!-- SECTION 3: UPLOADS ANALYSIS -->
        <div class="section">
            <div class="section-header">
                <span style="font-size:20px">📊</span>
                <h2>Phân Tích Chi Tiết wp-content/uploads</h2>
                <span class="badge">Ảnh gốc vs Ảnh bị cắt (resized)</span>
            </div>

            <div class="uploads-grid">
                <div class="upload-card original">
                    <div class="uc-label">🖼️ Ảnh gốc (Original)</div>
                    <div class="uc-count">
                        <?= number_format($uploadsStats['original_count']) ?>
                    </div>
                    <div class="uc-size">
                        <?= formatBytes($uploadsStats['original_size']) ?>
                    </div>
                    <div style="margin-top:12px;font-size:11px;color:#60a5fa">jpg, jpeg, png, gif, webp, avif — KHÔNG có
                        hậu tố -WxH</div>
                </div>

                <div class="upload-card resized">
                    <div class="uc-label">✂️ Ảnh bị cắt tự động (WordPress Resized)</div>
                    <div class="uc-count">
                        <?= number_format($uploadsStats['resized_count']) ?>
                    </div>
                    <div class="uc-size">
                        <?= formatBytes($uploadsStats['resized_size']) ?>
                    </div>
                    <div style="margin-top:12px;font-size:11px;color:#f87171">Pattern: filename-<em>150x150</em>.jpg,
                        -300x200.webp, v.v...</div>
                </div>

                <div class="upload-card other">
                    <div class="uc-label">📄 File khác (PDF, SVG, docs...)</div>
                    <div class="uc-count">
                        <?= number_format($uploadsStats['other_count']) ?>
                    </div>
                    <div class="uc-size">
                        <?= formatBytes($uploadsStats['other_size']) ?>
                    </div>
                    <div style="margin-top:12px;font-size:11px;color:#94a3b8">Bao gồm .pdf, .svg, các file không phải
                        ảnh</div>
                </div>
            </div>

            <!-- Tỉ lệ "lãng phí" -->
            <?php if ($uploadsStats['total_size'] > 0):
                $wastePercent = round(($uploadsStats['resized_size'] / $uploadsStats['total_size']) * 100, 1);
                ?>
                <div style="padding:0 20px 20px">
                    <div style="background:#0f172a;border-radius:10px;padding:16px">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
                            <span>📉 Tỉ lệ dung lượng bị chiếm bởi ảnh resize</span>
                            <strong style="color:<?= $wastePercent > 50 ? '#f87171' : '#fbbf24' ?>">
                                <?= $wastePercent ?>%
                            </strong>
                        </div>
                        <div class="progress-wrap" style="height:14px">
                            <div class="progress-bar"
                                style="width:<?= $wastePercent ?>%;background:linear-gradient(90deg,#dc2626,#ef4444)"></div>
                        </div>
                        <p style="font-size:11px;color:#64748b;margin-top:10px">
                            💡 <strong style="color:#fbbf24">Gợi ý:</strong> Nếu tỉ lệ này cao, hãy dùng plugin
                            <em>Regenerate Thumbnails</em> sau khi đã tắt các image size không cần thiết trong
                            functions.php, hoặc dùng plugin <em>Media Cleaner</em> để xóa file thừa.
                        </p>
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>⚠️ <strong>Nhắc nhở quan trọng:</strong> Hãy XÓA FILE <code>scan-storage.php</code> khỏi server ngay bây
                giờ!</p>
            <p style="margin-top:6px">Script này 100% READ-ONLY — Không có bất kỳ thao tác xóa hay sửa đổi nào.</p>
        </div>

    </div>
</body>

</html>