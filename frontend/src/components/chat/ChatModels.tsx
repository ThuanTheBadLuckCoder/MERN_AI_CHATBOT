import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material'
import React, { useState } from 'react'

const ChatModels = () => {
    const [model, setModel] = useState('Gemini');
    const handleChange = (event: SelectChangeEvent) => {
        setModel(event.target.value as string);
    };
    return (
        <FormControl fullWidth variant="standard" className="textWhiteColor">
            <InputLabel id="demo-simple-select-standard-label">Model</InputLabel>

            <Select
                labelId="demo-simple-select-standard-label"
                id="demo-simple-select-standard"
                value={model}
                label="Model"
                onChange={handleChange}

            >
                <MenuItem value={"GPT"}>GPT</MenuItem>
                <MenuItem value={"Gemini"}>Gemini</MenuItem>
            </Select>
        </FormControl>
    )
}

export default ChatModels