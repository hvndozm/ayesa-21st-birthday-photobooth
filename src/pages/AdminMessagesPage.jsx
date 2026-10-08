import PrivateMessageInbox from '../components/PrivateMessageInbox.jsx'

export default function AdminMessagesPage() {
  return <PrivateMessageInbox titleId="admin-messages-title" eyebrow="Birthday admin · Messages"
    title={<>Birthday <em>Messages</em></>} description="Read the birthday letters and keep track of unread wishes." />
}
