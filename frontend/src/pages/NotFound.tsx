import React from 'react'

const NotFound = () => {
  return (
    <div id="not-found" className='flex flex-wrap justify-center 
    items-center h-full overflow-hidden flex-col'>
      <h1 className='text-[20rem] font-mono font-black'>404</h1>
      <span className='font-serif text-4xl antialiased italic font-thin  text-center'>Oops! The page you're looking for doesn't exist in our system....</span>
    </div>
  )
}

export default NotFound