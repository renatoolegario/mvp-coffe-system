import React from "react";
import { Autocomplete, TextField } from "@mui/material";

const hasOwn = (value, key) =>
  Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);

const getTextContent = (node) => {
  if (Array.isArray(node)) {
    return node.map(getTextContent).filter(Boolean).join(" ").trim();
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (React.isValidElement(node)) {
    return getTextContent(node.props?.children);
  }

  return "";
};

const extractOptions = (children, acc = []) => {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }

    if (hasOwn(child.props, "value")) {
      const label = getTextContent(child.props.children).trim();

      acc.push({
        value: child.props.value,
        label: label || String(child.props.value ?? ""),
        disabled: Boolean(child.props.disabled),
      });
      return;
    }

    if (child.props?.children) {
      extractOptions(child.props.children, acc);
    }
  });

  return acc;
};

const buildSyntheticEvent = (value, name) => ({
  target: { value, name },
  currentTarget: { value, name },
  preventDefault() {},
  stopPropagation() {},
});

export default function SearchableSelect({
  children,
  value,
  onChange,
  label,
  helperText,
  error = false,
  required = false,
  disabled = false,
  fullWidth = false,
  size = "medium",
  sx,
  name,
  placeholder,
  id,
  InputLabelProps,
  noOptionsText = "Nenhuma opção encontrada",
  disableClearable = true,
  autoFocus = false,
  onBlur,
  ...textFieldProps
}) {
  const options = extractOptions(children);
  let selectedOption =
    options.find((option) => Object.is(option.value, value)) || null;

  if (
    !selectedOption &&
    value !== "" &&
    value !== null &&
    value !== undefined
  ) {
    selectedOption = {
      value,
      label: String(value),
      disabled: false,
    };
    options.push(selectedOption);
  }

  return (
    <Autocomplete
      options={options}
      value={selectedOption}
      onChange={(_, nextOption) => {
        onChange?.(
          buildSyntheticEvent(nextOption?.value ?? "", name),
          nextOption || null,
        );
      }}
      getOptionLabel={(option) => String(option?.label ?? "")}
      isOptionEqualToValue={(option, current) =>
        Object.is(option.value, current?.value)
      }
      getOptionDisabled={(option) => Boolean(option.disabled)}
      disableClearable={disableClearable}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      sx={sx}
      noOptionsText={noOptionsText}
      openOnFocus
      autoHighlight
      slotProps={{
        popper: {
          sx: {
            zIndex: (theme) => theme.zIndex.modal + 30,
          },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...textFieldProps}
          {...params}
          id={id}
          name={name}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          onBlur={onBlur}
          InputLabelProps={InputLabelProps}
        />
      )}
    />
  );
}
