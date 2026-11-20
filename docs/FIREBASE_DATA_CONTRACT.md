# Firebase and ThingsBoard data contract

## Profile photos

The web client uploads profile photos to Firebase Storage at `users/{uid}/profile/avatar`. Set `VITE_FIREBASE_STORAGE_BUCKET` from Firebase Project settings and enable Firebase Storage. Publish the matching owner-only Storage rules before using uploads. Images are limited to 5 MB by the client and Storage rules should enforce the same limit and image content types.

## Account activity

The app writes its own account events to `users/{uid}/activity/{autoId}` with:

```json
{ "type": "profile_updated | avatar_updated | password_changed | signed_in", "createdAt": "server timestamp" }
```

The client treats activity logging as best-effort; failed history writes do not undo a profile or password update.

## Energy usage history

The account page reads, but never writes, `users/{uid}/energyHistory/{autoId}`. The ThingsBoard integration backend should write records only after authenticating and mapping a ThingsBoard device to an owner. Expected fields:

```json
{
  "deviceName": "Kitchen outlet",
  "energyKwh": 1.234,
  "recordedAt": "Firestore timestamp",
  "source": "thingsboard"
}
```

`recordedAt` is the period end/sample time and `energyKwh` is a measured or backend-calculated value. Do not create placeholder records. The UI displays an empty state until real backend records arrive.

## Firestore access policy

Keep `devices`, `alerts`, and `energyHistory` client read-only. Allow authenticated owners to read their own account documents and activity entries. Backend/Admin SDK writes energy history and device/alert data. Adjust the deployed Firebase rules deliberately; the app does not deploy rules automatically.

Example Firestore and Storage policies are in irestore.rules.example and storage.rules.example. Review them against your existing backend, merge them with the active policies, and publish through Firebase Console before relying on activity writes or image uploads. Do not blindly replace rules used by another service.
