# PinkyChat – Bài thực hành 6

Phát triển tiếp ứng dụng chat của Bài 5 (`ChatRealtime`) bằng React Native CLI + Firebase Realtime Database + Cloudinary:
chat nhóm, gửi ảnh, trạng thái "đang soạn tin" / "đã xem", thu hồi tin nhắn, cảm xúc và màn hình Thông báo dùng dữ liệu thật.

## Cài đặt & chạy

```sh
npm install
cd ios && bundle exec pod install && cd ..   # chỉ với iOS
npm run android      # hoặc: npm run ios
```

### 1. Cloudinary (bắt buộc để gửi ảnh)

1. Cloudinary Console → **Settings → Upload → Upload presets → Add upload preset**, chọn **Signing mode: Unsigned**.
2. Điền `cloudName` và tên preset vào [src/services/cloudinaryConfig.ts](src/services/cloudinaryConfig.ts).

Ứng dụng chỉ dùng unsigned preset — **không** có API key / API secret trong mã nguồn.

### 2. Deploy Security Rules

Dùng chung project Firebase của Bài 5 (`pinkychat-79da3`). Luật mới nằm trong [database.rules.json](database.rules.json):

```sh
npx firebase-tools login
npx firebase-tools deploy --only database
```

Dữ liệu cũ của Bài 5 vẫn dùng được: lần đầu mở lại một cuộc trò chuyện 1-1 cũ, app tự tạo `conversations/{convId}` cho nó.

## Cấu trúc dữ liệu

```
conversations/{convId}      { type: "direct"|"group", name, members: {uid: true}, createdBy, createdAt }
messages/{convId}/{msgId}   { senderId, type: "text"|"image"|"location"|"system", text, imageUrl, width, height,
                              lat, lng, createdAt, recalled, reactions: {uid: "❤️"}, replyTo }
userChats/{uid}/{convId}    { type, name | partnerId, lastMessage, lastMessageId, lastType, lastSenderId, updatedAt, unread }
readStatus/{convId}/{uid}   thời điểm đọc cuối
typing/{convId}/{uid}       true
viewing/{convId}/{uid}      true   (đang mở cuộc trò chuyện → không cần tạo thông báo)
notifications/{uid}/{id}    { type: "message"|"group_added"|"reaction", convId, fromUid, text, createdAt, read }
```

Chat 1-1 có `convId = uidA_uidB` (sắp xếp theo thứ tự), nhóm dùng push key.

## Đối chiếu yêu cầu

### Phần A

| Yêu cầu | Cài đặt |
|---|---|
| "đang soạn tin…", tự tắt sau 3 giây / khi gửi / khi rời màn | `handleChangeText`, `stopTyping` trong [ChatScreen.tsx](src/screens/ChatScreen.tsx); `setTyping`, `enterConversation` trong [presenceService.ts](src/services/presenceService.ts) |
| "Đã gửi" / "Đã xem lúc HH:mm" realtime | `readStatus/{convId}` + `statusOf()` trong ChatScreen (nhóm: "Đã xem bởi N người") |
| "Hoạt động X phút trước" | `formatPresence` trong [time.ts](src/utils/time.ts), làm mới mỗi 30 giây bằng `useNow` |
| `onDisconnect()` cho online và đang gõ | `startPresence` và `enterConversation` (đăng ký lại mỗi lần kết nối lại) |
| Nhấn giữ: Sao chép, Thu hồi, cảm xúc 👍 ❤️ 😂 😮 😢 | [MessageMenu.tsx](src/components/chat/MessageMenu.tsx) |
| Thu hồi = `recalled: true`, cập nhật lastMessage ở Home nếu là tin cuối | `recallMessage` trong [chatService.ts](src/services/chatService.ts) |
| Cảm xúc dưới bong bóng, kèm số lượng | `Reactions` trong [MessageBubble.tsx](src/components/chat/MessageBubble.tsx) |
| Chụp / chọn ảnh, xin quyền camera | `pickImage` trong [uploadService.ts](src/services/uploadService.ts) |
| Thu nhỏ cạnh dài ≤ 1024px, tải lên Cloudinary, chỉ lưu URL | `maxWidth/maxHeight = 1024` khi lấy ảnh; `uploadImage` (XHR + unsigned preset) |
| Bong bóng tạm có loading, lỗi thì "Thử lại" | [PendingUploadBubble.tsx](src/components/chat/PendingUploadBubble.tsx), `runUpload` trong ChatScreen |
| Xem ảnh toàn màn hình | [ImageViewer.tsx](src/components/chat/ImageViewer.tsx) |
| Home: "📷 Hình ảnh", "📍 Vị trí" | `previewOf` trong chatService |
| Tạo nhóm: tên + checkbox, tối thiểu 2 người | [CreateGroupScreen.tsx](src/screens/CreateGroupScreen.tsx), [MemberPicker.tsx](src/components/MemberPicker.tsx) |
| Tên người gửi trên bong bóng, tiêu đề nhóm + số người online | ChatScreen (`senderLabel`, `subtitle`) |
| Home gộp 1-1 + nhóm, sắp theo tin mới nhất, chưa đọc riêng từng người | [HomeScreen.tsx](src/screens/HomeScreen.tsx), `userChats/{uid}` |
| Thông báo thật + badge + mở đúng cuộc trò chuyện + "Đọc tất cả" | [NotificationsScreen.tsx](src/screens/NotificationsScreen.tsx), [notificationService.ts](src/services/notificationService.ts), badge trong [AppNavigator.tsx](src/navigation/AppNavigator.tsx) |

### Phần B

- **Multi-path update + `increment(1)`**: `addMessageUpdates` ghi tin nhắn, `userChats` của mọi thành viên và thông báo trong **một** `update()`; số chưa đọc tăng bằng `increment(1)`. Tạo nhóm, thu hồi, thả cảm xúc, đánh dấu đã đọc cũng mỗi thao tác một lệnh `update()`.
- **Security Rules**: [database.rules.json](database.rules.json). Chỉ thành viên mới đọc/ghi được `messages`, `typing`, `readStatus`; chỉ người gửi mới thu hồi được; mỗi người chỉ ghi `typing`, `readStatus`, `reactions` của chính mình. Các lệnh ghi nhiều đường dẫn (tạo nhóm, thêm thành viên) được kiểm tra trên trạng thái *sau khi ghi* bằng `newData.parent()…`.
- **Phân trang**: `createMessagePager` — lần đầu `limitToLast(20)`, kéo lên đầu thì thêm một trang `endBefore(con trỏ) + limitToLast(20)`. FlatList `inverted` nối tin cũ vào cuối mảng nên danh sách không bị nhảy.
- Mã Firebase / Cloudinary nằm trong `src/services/` (`chatService`, `groupService`, `uploadService`, `notificationService`, `presenceService`, `userService`).
- Mọi listener được hủy trong cleanup của `useEffect`.

### Phần C (nâng cao)

- **Quản trị nhóm** ([GroupInfoScreen.tsx](src/screens/GroupInfoScreen.tsx), [AddMembersScreen.tsx](src/screens/AddMembersScreen.tsx)): đổi tên, thêm thành viên, trưởng nhóm xóa thành viên, rời nhóm — mỗi thao tác để lại tin hệ thống ("A đã rời nhóm"…).
- **Trả lời tin**: chọn "Trả lời" trong menu nhấn giữ; nhấn vào phần trích dẫn thì cuộn tới tin gốc (tự tải thêm trang nếu cần).
- **Hồ sơ cá nhân**: Cài đặt → Thông tin cá nhân — đổi họ tên và ảnh đại diện (Cloudinary); ảnh mới hiện ở Danh bạ, Home và Chat.
- **Tìm kiếm tin nhắn** trong cuộc trò chuyện: nút 🔍 trên thanh tiêu đề Chat.
