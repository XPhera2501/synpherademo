import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getComments, addComment, type DbComment } from '@/lib/supabase-store';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CommentThreadProps {
  promptId: string;
}

interface CommentWithProfile extends DbComment {
  profileName?: string;
}

export function CommentThread({ promptId }: CommentThreadProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const loadComments = async () => {
    const data = await getComments(promptId);
    // Fetch profiles for comment authors
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);
    setComments(data.map(c => ({ ...c, profileName: profileMap.get(c.user_id) || 'Unknown' })));
  };

  useEffect(() => { loadComments(); }, [promptId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setLoading(true);
    const result = await addComment({
      prompt_id: promptId,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (result) {
      setNewComment('');
      await loadComments();
      toast.success('Comment added');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageCircle className="h-4 w-4 text-primary" />
        Comments ({comments.length})
      </div>
      
      {comments.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-auto">
          {comments.map(comment => (
            <div key={comment.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{comment.profileName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a review comment..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          className="text-sm min-h-[60px]"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!newComment.trim() || loading}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
