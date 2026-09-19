
import { useState, ChangeEvent } from 'react';

export const useForm = <T extends object>(initialState: T) => {
    const [values, setValues] = useState<T>(initialState);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        let processedValue: string | number | boolean = value;

        if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
            processedValue = e.target.checked;
        } else if (type === 'number' && e.target instanceof HTMLInputElement) {
            processedValue = e.target.valueAsNumber;
        }

        setValues({
            ...values,
            [name]: processedValue,
        });
    };

    const resetForm = () => {
        setValues(initialState);
    };

    return {
        values,
        handleInputChange,
        setValues,
        resetForm,
    };
};
