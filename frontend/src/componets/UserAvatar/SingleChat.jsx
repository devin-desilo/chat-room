import React, { useEffect, useState } from 'react'
import { ChatState } from '../../Context/ChatProvider'
import { ClassNames } from '@emotion/react'
import { Center, FormControl, Input, Spinner, useToast } from '@chakra-ui/react'
import { getSender, getSenderFull } from '../../config/ChatLogics'
import { ProfileModal } from '../miscellaneous/ProfileModal'
import UpdateGroupChatModal from '../miscellaneous/UpdateGroupChatModal'
import axios from 'axios'
import io from 'socket.io-client';
import ScrollableChat from '../ScrollableChat'
import Lottie from "lottie-react";
import animationData from '../../animations/typing.json';
import EmojiPicker from 'emoji-picker-react';


// const ENDPOINT = "http://localhost:5000";
var socket , selectedChatCompare; 

const SingleChat = ({fetchAgain, setFetchAgain}) => {
      const [inputStr, setInputStr] = useState('');
    const [showPicker, setShowPicker] = useState(false);
   
    const {user, selectedChat, setSelectedChat ,  notification, setNotification} = ChatState()
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [socketConnected, setSocketConnected] = useState(false);
    const [typing, setTyping] = useState(false);
    const [istyping, setIsTyping] = useState(false);
    const toast = useToast();
    const onEmojiClick = (event, emojiObject) => {
        console.log('event', event)
      setNewMessage(prevInput => prevInput + event.emoji);
      setShowPicker(false);
    };

    // const defaultOptions = {
        //     loop: true,
    //     autoplay: true,
    //     animationData: animationData,
    //     rendererSettings: {
    //       preserveAspectRatio: "xMidYMid slice",
    //     },
    //   };

    const  fetchMessage = async () => {
        if(!selectedChat) return
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                }
            }

            setLoading(true)

            const {data} = await axios.get(`/api/message/${selectedChat._id}`, config)
            // console.log(data);
            setMessages(data);
            setLoading(false);
            socket.emit('join chat', selectedChat._id);
        } catch (error) {
            console.log(error)
            toast({
                title: "Error Occured !",
                description:"Failed to send the Message",
                status:"error",
                duration:3000,
                isClosable: true,
                position:"bottom-right"
            })
        }
    }

    
    useEffect(() =>{
        socket = io();
        socket.emit("setup",user);
        socket.on('Connected',() => setSocketConnected(true))
        socket.on('typing', ()=>setIsTyping(true))
        socket.on('stop typing', ()=>setIsTyping(false))
    },[]);


    useEffect(() => {
        fetchMessage();


        selectedChatCompare = selectedChat;
    }, [selectedChat]);

    

    useEffect(() => {
        socket.on("message recieved", (newMessageRecieved) => {
            if(!selectedChatCompare || selectedChatCompare._id !== newMessageRecieved.chat._id){
                    if(!notification.includes(newMessageRecieved)) {
                        setNotification([newMessageRecieved,...notification]);  
                        setFetchAgain(!fetchAgain)
                    }
            }else{
                setMessages([...messages, newMessageRecieved])
            }
        })
    })


    const sendMessage = async(event) => {
        if(event.key === "Enter" && newMessage){
            socket.emit('stop typing', selectedChat._id);
            try {
                const config ={
                    headers: {
                        "Content-Type":"application/json",
                        Authorization:`Bearer ${user.token}`,
                    }
                }

                setNewMessage("");
                const {data} = await axios.post('/api/message', {
                    content: newMessage,
                    chatId: selectedChat._id,
                },config);

                // console.log('message sent');
                socket.emit("new message", data);
                setMessages([...messages, data])
            } catch (error) {
                toast({
                    title: "Error Occured !",
                    description:"Failed to send the Message",
                    status:"error",
                    duration:3000,
                    isClosable: true,
                    position:"bottom-right"
                })
            }
        }
    }

    const typingHandler = (e) => {
        setNewMessage(e.target.value);

        if(!socketConnected) return;
        if(!typing){
            setTyping(true)
            socket.emit('typing', selectedChat._id);
        }
        let lastTypingTime = new Date().getTime();
        var timerLength = 3000;
        setTimeout(()=> {
            var timeNow = new Date().getTime();
            var timeDiff = timeNow - lastTypingTime;
            if(timeDiff >= timerLength && typing) {
                socket.emit('stop typing', selectedChat._id);
                setTyping(false);
            }
        },timerLength);
    }

  return (
    <div>
        {
            selectedChat  ? (
                <div className='p-2 w-[calc(100vw_-_330px)] h-[calc(100vh_-_80px)]'>
                    <div className='flex items-center justify-between'>
                        {/* left arrow  */}
                        <div onClick={() => setSelectedChat("")}>
                            <svg xmlns="http://www.w3.org/2000/svg"   fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10">
                                <path stroke-linecap="round" className='text-white' stroke-linejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        {/* name  */}
                        <div>
                            {!selectedChat.isGroupChat ? (
                                <div className='text-lg font-medium'>{getSender(user, selectedChat.users)}</div>
                            ) : (
                                <>
                                    {selectedChat.chatName.toUpperCase()}
                                </>
                            )}
                        </div>

                        {/* profile view  */}
                        <div>
                        {!selectedChat.isGroupChat ? (
                                <ProfileModal user={getSenderFull(user, selectedChat.users)}/>
                        ) :(
                             <UpdateGroupChatModal 
                                fetchAgain={fetchAgain}
                                setFetchAgain={setFetchAgain}
                                fetchMessage={fetchMessage}
                                />
                        )}
                        </div>
                    </div>
                    {/* message box  */}
                    <div className="h-full w-full flex-col flex pb-6 justify-between items-center">
                        {loading ? (
                            <div className=''>
                                <Spinner size='xl' w={20} h={20} alignSelf='Center' margin='auto' />
                            </div>
                        ) : ( <div className=' justify-start overflow-auto self-start w-full'>
                            <ScrollableChat  messages={messages}/>
                            {istyping?<div>
                                    <Lottie
                                        animationData={animationData}
                                        loop={true}
                                        width={'20px'}
                                        style={{marginLeft: 20 , width: 80}}
                                    />
                                </div> : ""}
                        </div>)}    
                        <div className='w-full'>
                            <FormControl onKeyDown={sendMessage} isRequired mt={3}>
                                    <div className='mb-2' >
                                    {showPicker && <EmojiPicker
                                    onEmojiClick={onEmojiClick} />}
                                </div>
                                <Input placeholder='Enter a Message' onChange={typingHandler} value={newMessage} className='w-full'/>
                                <div className='py-2 flex items-center justify-between'>
                        <div className="flex items-center justify-start gap-2">
                            {/* emojis  */}
                            <div className=' ' onClick={() => setShowPicker(val => !val)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path className='text-white' stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                                </svg>
                            </div>

                            {/* images */}
                            <div>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path className='text-white' stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                            </div>

                            {/* gif */}
                            <div>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                                    <path className='text-white' stroke-linecap="round" stroke-linejoin="round" d="M12.75 8.25v7.5m6-7.5h-3V12m0 0v3.75m0-3.75H18M9.75 9.348c-1.03-1.464-2.698-1.464-3.728 0-1.03 1.465-1.03 3.84 0 5.304 1.03 1.464 2.699 1.464 3.728 0V12h-1.5M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                </svg>

                            </div>
                        </div>

                        
                    </div>
                            </FormControl>
                        </div>
                    </div>
                </div>
            ) : ( 
                <div className='text-xl text-white w-[calc(100vw_-_330px)] h-[calc(100vh_-_80px)] flex items-center justify-center'>
                    <p>CliCk On User To Satrt Chating....</p>
                </div>
            )
        }
    </div>
  )
}

export default SingleChat