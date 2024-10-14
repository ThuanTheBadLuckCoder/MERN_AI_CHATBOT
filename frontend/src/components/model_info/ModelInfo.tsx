import { Box } from '@mui/material'
import React from 'react';

interface ModelInfoProps {
    imgLink: string, 
    description: string, 
    linkDetail: string
}

const ModelInfo: React.FC<ModelInfoProps> = ({imgLink, description, linkDetail}) => {
  return (
    <Box sx={{display: "flex", flexDirection: "column", flexWrap: "nowrap", gap: "20px"}}>
        <img src={imgLink} style={{width: "100%"}}/>
        <span>{description} <a target="_blank" href={linkDetail}>see more...</a></span>
    </Box>
  )
}

export default ModelInfo;
