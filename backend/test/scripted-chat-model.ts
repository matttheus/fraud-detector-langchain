import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';

export class ScriptedChatModel extends BaseChatModel {
  calls = 0;

  constructor(private readonly replies: AIMessage[]) {
    super({});
  }

  _llmType() {
    return 'scripted';
  }

  override bindTools() {
    return this;
  }

  async _generate(): Promise<ChatResult> {
    const message = this.replies[this.calls++];
    if (!message) throw new Error('ScriptedChatModel ran out of replies');
    return { generations: [{ text: '', message }] };
  }
}

export const verdictReply = (verdict: object) => new AIMessage(JSON.stringify(verdict));

export const historyToolCall = (args: object = {}) =>
  new AIMessage({ content: '', tool_calls: [{ id: 'call_1', name: 'get_transaction_history', args }] });
