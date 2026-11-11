# Security Specification — Baca3D: Pemimpin Cilik

## 1. Data Invariants
1. **Identity Binding**: A `/students/{studentId}` document must have `studentId == request.auth.uid` and `data.uid == request.auth.uid`. No user may create or modify another student's profile.
2. **Verified Email**: Write operations require `request.auth.token.email_verified == true`.
3. **Zero PII in Public Student Profiles**: `/students/{studentId}` stores only non-PII literacy game attributes (`displayName`, `className`, `tokens`, `totalXp`, `tpLevel`, `avgClarity`, `avgIntonation`, bounded arrays for paragraphs/checkpoints/badges/accessories, equipped item IDs, `rumusanAnswer`, `updatedAt`).
4. **Strict Numeric & Array Bounds**:
   - `tpLevel` is an integer/number between `1` and `6`.
   - `tokens` is between `0` and `100000`.
   - `totalXp` is between `0` and `500000`.
   - `avgClarity` and `avgIntonation` are between `0` and `100`.
   - All arrays (`completedParagraphs`, `completedCheckpoints`, `unlockedBadges`, `unlockedAccessories`) are strictly bounded in size (`<= 30`).
5. **Temporal Integrity**: `updatedAt` on `/students/{studentId}` and `createdAt` on `/reading_logs/{logId}` must equal `request.time`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null` attempting `create` on `/students/user_1`.
2. **Unverified Email Spoof**: `auth.uid = 'user_1', email_verified = false` attempting `create` on `/students/user_1`.
3. **Identity Spoofing on Profile**: `auth.uid = 'attacker'` attempting `create` on `/students/victim` or setting `data.uid = 'victim'`.
4. **Shadow Field Injection on Create**: Adding `isAdmin: true` to `/students/user_1`.
5. **Shadow Field Injection on Update**: Updating `/students/user_1` with an undeclared key `hackedScore: 999999`.
6. **Immutable UID Mutation**: Updating `uid` on `/students/user_1` to another user's UID.
7. **TP Level Out-of-Bounds**: Setting `tpLevel: 99` or `tpLevel: 0` (must be `1..6`).
8. **Negative Token Exploit**: Setting `tokens: -500` or `tokens: 999999999`.
9. **String Size Exhaustion (Denial of Wallet)**: Setting `displayName` to a 10,000-character string (must be `<= 60`).
10. **Array Bombing**: Sending 500 items in `completedParagraphs` (must be `<= 15`).
11. **Timestamp Forgery**: Providing a past/future timestamp instead of `request.time` for `updatedAt` or `createdAt`.
12. **Cross-User Reading Log Read/List**: Querying `/reading_logs` where `resource.data.uid != request.auth.uid`.
