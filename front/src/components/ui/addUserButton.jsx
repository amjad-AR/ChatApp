// import { button } from 'framer-motion/client'
import Button from './Button.jsx'
import { FaUserPlus } from 'react-icons/fa'

const addUserButton = () => {
  return (
      <Button title="Add User" className='bg-gray-700 hover:bg-gray-400 text-gray-800 w-full text-3xl h-16'
      icon={<FaUserPlus/>}
      />
  )
}

export default addUserButton