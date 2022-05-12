import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import SendbirdChat, { UserUpdateParams } from "@sendbird/chat";
import {
  OpenChannel,
  OpenChannelCreateParams,
  OpenChannelHandler,
  OpenChannelModule,
} from "@sendbird/chat/openChannel";
import {
  BaseMessage,
  MessageListParams,
  MessageModule,
} from "@sendbird/chat/message";
import { ModuleNamespaces } from "@sendbird/chat/lib/__definition";

let sb: SendbirdChat &
  ModuleNamespaces<
    [...OpenChannelModule[], MessageModule],
    MessageModule | OpenChannelModule
  >;

export const Main = () => {
  const [settingUpUser, setSettingUpUser] = useState<boolean>(true);
  const [userIdInputValue, setUserIdInputValue] = useState<string>("");
  const [userNameInputValue, setUserNameInputValue] = useState<string>("");

  const [channels, setChannels] = useState<Array<OpenChannel>>([]);
  const [messages, setMessages] = useState<Array<BaseMessage>>([]);
  const [currentlyJoinedChannel, setCurrentlyJoinedChannel] =
    useState<OpenChannel | null>(null);

  const [messageInputValue, setMessageInputValue] = useState<string>("");

  const [channelNameInputValue, setChannelNameInputValue] =
    useState<string>("");

  const handleChangeUserIdInput = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setUserIdInputValue(event.target.value);
  };

  const handleChangeUserNameInput = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setUserNameInputValue(event.target.value);
  };

  const handleClickConnectBtn = async (): Promise<void> => {
    const sendbirdChat = SendbirdChat.init({
      appId: process.env.REACT_APP_SENDBIRD_APP_ID as string,
      localCacheEnabled: false,
      modules: [new OpenChannelModule()],
    });

    await sendbirdChat.connect(userIdInputValue);
    await sendbirdChat.setChannelInvitationPreference(true);
    await sendbirdChat.updateCurrentUserInfo(
      new UserUpdateParams({
        nickname: userNameInputValue,
      }),
    );

    sb = sendbirdChat;
    const { channels, error } = await loadChannels();
    if (error != null) {
      throw Error(`Can't load channels. :(`);
    }
    if (channels == null) {
      throw Error(`Can't load channels. :(`);
    }
    setSettingUpUser(false);
    setChannels(channels);
  };

  const handleJoinChannel = async (params: {
    channelUrl: string;
  }): Promise<void> => {
    const channelToJoin = channels.find(
      (channel) => channel.url === params.channelUrl,
    );
    if (channelToJoin == null) {
      throw new Error(`No channel to join! :(`);
    }

    const {
      channel,
      messages: newMessages,
      error,
    } = await joinChannel({
      channel: channelToJoin,
    });

    if (error != null) {
      throw new Error(`Can't join server! :(`);
    }

    const channelHandler = new OpenChannelHandler();

    channelHandler.onMessageUpdated = (channel, message) => {
      const messageIndex = messages.findIndex(
        (item) => item.messageId == message.messageId,
      );
      const updatedMessages = messages;
      updatedMessages[messageIndex] = message;
      setMessages(updatedMessages);
    };

    channelHandler.onMessageReceived = (channel, message) => {
      const updatedMessages = [...messages, message];
      setMessages(updatedMessages);
    };

    channelHandler.onMessageDeleted = (channel, message) => {
      const updatedMessages = messages.filter((messageObject) => {
        return messageObject.messageId !== message;
      });
      setMessages(updatedMessages);
    };

    sb.openChannel.addOpenChannelHandler(uuid(), channelHandler);
    setCurrentlyJoinedChannel(channel);
    setMessages(newMessages ?? []);
  };

  const handleDeleteChannel = async (params: {
    channelUrl: string;
  }): Promise<void> => {
    const { error } = await deleteChannel(params);

    if (error != null) {
      throw new Error(`Can't delete server! :(`);
    }

    const updatedChannels = channels.filter((channel) => {
      return channel.url !== params.channelUrl;
    });
    setChannels(updatedChannels);
  };

  const handleChangeChannelNameInput = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setChannelNameInputValue(event.target.value);
  };

  const handleClickCreateChannelBtn = async (): Promise<void> => {
    const { openChannel, error } = await createChannel({
      channelName: channelNameInputValue,
    });
    if (error != null) {
      throw Error(`Can't create channel. :(`);
    }
    if (openChannel == null) {
      throw Error(`Can't create channel. :(`);
    }
    setChannels((prevState) => [openChannel, ...prevState]);
  };

  const handleChangeMessageInput = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setMessageInputValue(event.target.value);
  };

  return (
    <>
      <div className="w-full h-screen p-20 gap-y-10 flex flex-col bg-neutral-200">
        <header className="w-full flex items-center justify-center">
          <h1 className="text-4xl">Sendwave</h1>
        </header>
        <main className="w-full h-0 flex flex-grow border border-stone-800 divide-x divide-stone-800">
          <aside className="w-80 h-full flex flex-col justify-between">
            <div className="p-5 gap-y-3 flex flex-col">
              <h2 className="text-2xl">Channels</h2>
              <ul className="w-full">
                {channels.map((channel) => {
                  const isOperator = channel.operators.some(
                    (operator) => operator.userId === sb.currentUser.userId,
                  );

                  return (
                    <li
                      key={channel.url}
                      className="w-full h-10 flex justify-between"
                    >
                      <button
                        className="h-full"
                        onClick={() =>
                          handleJoinChannel({ channelUrl: channel.url })
                        }
                      >
                        {channel.name}
                      </button>
                      {isOperator && (
                        <button
                          onClick={() =>
                            handleDeleteChannel({ channelUrl: channel.url })
                          }
                        >
                          delete
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="h-60 p-5 flex flex-col justify-between border-t border-stone-800">
              <div>
                <h3 className="mb-4 text-xl">Create New Channel</h3>
                <div className="w-full flex flex-col">
                  <span className="mb-2">Channel Name</span>
                  <input
                    className="w-full p-2 border border-stone-800 bg-transparent"
                    type="text"
                    placeholder="Enter Channel Name"
                    onChange={handleChangeChannelNameInput}
                  />
                </div>
              </div>
              <button
                className="p-2 text-stone-50 bg-stone-700 rounded"
                onClick={handleClickCreateChannelBtn}
              >
                Create!
              </button>
            </div>
          </aside>
          <article className="w-full h-full">
            {currentlyJoinedChannel ? (
              <article className="w-full h-full flex flex-col divide-y divide-stone-800">
                <div className="w-full h-20 flex items-center justify-center border">
                  <h3 className="text-xl">
                    {currentlyJoinedChannel.name} Channel
                  </h3>
                </div>
                <div className="h-0 flex-grow">
                  {messages.map((message) => {
                    return <>{message.data}</>;
                  })}
                </div>
                <div className="w-full h-24 p-4 gap-x-2 flex items-center justify-between">
                  <input
                    className="w-full h-full p-2 border border-stone-800 bg-transparent"
                    onChange={handleChangeMessageInput}
                  />
                  <button className="w-40 h-full text-stone-50 bg-stone-800">
                    Send
                  </button>
                </div>
              </article>
            ) : (
              <></>
            )}
          </article>
        </main>
      </div>
      {settingUpUser ? (
        <>
          <div className="fixed top-0 bottom-0 left-0 right-0 bg-stone-800 opacity-40" />
          <article className="w-[40rem] h-[40rem] p-16 fixed block top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between bg-neutral-200 rounded-xl">
            <h2 className="pb-8 text-2xl">User Setting</h2>
            <div className="w-full h-full flex flex-col gap-y-10">
              <div className="w-full flex flex-col">
                <span className="mb-2">ID</span>
                <input
                  className="w-full p-4 border border-stone-800 bg-transparent"
                  type="text"
                  placeholder="Enter ID"
                  onChange={handleChangeUserIdInput}
                />
              </div>
              <div className="w-full flex flex-col">
                <span className="mb-2">Nickname</span>
                <input
                  className="w-full p-4 border border-stone-800 bg-transparent"
                  type="text"
                  placeholder="Enter Nickname"
                  onChange={handleChangeUserNameInput}
                />
              </div>
            </div>
            <button
              className="w-full p-4 text-stone-50 bg-stone-700 rounded"
              onClick={handleClickConnectBtn}
            >
              Connect to Sendwave
            </button>
          </article>
        </>
      ) : (
        <></>
      )}
    </>
  );
};

const loadChannels = async (): Promise<
  | { channels: Array<OpenChannel>; error: null }
  | { channels: null; error: unknown }
> => {
  try {
    const openChannelQuery = sb.openChannel.createOpenChannelListQuery({
      limit: 30,
    });
    const channels = await openChannelQuery.next();
    return { channels, error: null };
  } catch (error) {
    return { channels: null, error };
  }
};

const joinChannel = async (params: {
  channel: OpenChannel;
}): Promise<
  | { channel: OpenChannel; messages: Array<BaseMessage>; error: null }
  | { channel: null; messages: null; error: unknown }
> => {
  try {
    await params.channel.enter();

    const messageListParams = new MessageListParams();
    messageListParams.nextResultSize = 20;
    const messages = await params.channel.getMessagesByTimestamp(
      0,
      messageListParams,
    );
    return { channel: params.channel, messages, error: null };
  } catch (error) {
    return { channel: null, messages: null, error };
  }
};

const deleteChannel = async (params: {
  channelUrl: string;
}): Promise<
  { channel: OpenChannel; error: null } | { channel: null; error: unknown }
> => {
  try {
    const channel = await sb.openChannel.getChannel(params.channelUrl);
    await channel.delete();
    return { channel, error: null };
  } catch (error) {
    return { channel: null, error };
  }
};

const createChannel = async (params: {
  channelName: string;
}): Promise<
  | { openChannel: OpenChannel; error: null }
  | { openChannel: null; error: unknown }
> => {
  try {
    const openChannelParams = new OpenChannelCreateParams();
    openChannelParams.name = params.channelName;
    openChannelParams.operatorUserIds = [sb.currentUser.userId];
    const openChannel = await sb.openChannel.createChannel(openChannelParams);
    return { openChannel, error: null };
  } catch (error) {
    return { openChannel: null, error };
  }
};
