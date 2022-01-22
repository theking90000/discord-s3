import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "next-i18next";
import { createContext, FC, useContext, useEffect, useState } from "react";
import {
  axiosApiClient,
  axiosClient,
  useFetchQuery,
} from "../../lib/data-fetch";
import merge from "deepmerge";
import { ValueContext } from "../../pages/_app";
import SelectFromData from "./SelectFromData";

const BaseForm: FC<{ path: string; onSubmited?: (value: any) => void }> = ({
  path,
  onSubmited,
}) => {
  const { data, isLoading, error } = useFetchQuery<any>(`${path}/schema`);
  const [realData, setRealData] = useState(data);
  console.log("update", data);
  const [preprocess, setPreprocess] = useState([]);

  function applyPreprocess(processSchema: any) {
    if (processSchema.$mutate) {
      setRealData(merge(realData, processSchema.$mutate));
    }
    if (processSchema.$setValue) {
      updateValue(merge(processSchema.$setValue, value));
    }
  }

  useEffect(() => {
    if (data && preprocess.length > 0)
      preprocess.forEach((d) => applyPreprocess(d));
    else setRealData(data || {});
  }, [data, preprocess]);

  const { t } = useTranslation("common");
  const [value, updateValue] = useState({});
  const [loading, setLoading] = useState(false);
  const [hError, setError] = useState(null);

  async function handleSubmit() {
    if (loading) return;

    setLoading(true);

    try {
      const { data } = await axiosApiClient.post(path, value);
      setError(null);
      if (data.$schema) {
        setPreprocess(preprocess.concat(data.$schema));
        setLoading(false);
        return;
      }
      onSubmited && onSubmited(data);
    } catch (e) {
      setError(e.message);
    }

    setLoading(false);
  }

  return (
    <ValueContext.Provider
      value={{
        value,
        setValue: (newValue) => {
          updateValue(Object.assign({}, newValue));
        },
      }}
    >
      <VStack>
        {isLoading && <Spinner />}
        {realData && realData?.type === "object" && (
          <>
            <MultiField schema={realData} />
            {error && "error"}
            {hError && <Text color="red.500">{hError}</Text>}
            <Button onClick={handleSubmit}>
              {loading ? <Spinner /> : t(realData?.$submit || "submit")}
            </Button>
          </>
        )}
      </VStack>
    </ValueContext.Provider>
  );
};

const MultiField: FC<{ schema: any }> = ({ schema }) => {
  const [category, setCategory] = useState<number | null>(null);
  const { value, setValue } = useContext(ValueContext);
  useEffect(() => {
    if (schema.oneOf && !category) {
      setCategory(0);
    }
  }, [schema, category]);

  return (
    <VStack width="100%">
      {category !== null && (
        <Select
          onChange={(e: any) => {
            schema.oneOf[category].required.forEach((key) => {
              delete value[key];
            });
            setValue(value);
            setCategory(e.target.value);
          }}
          placeholder={schema.oneOf[category].$placeholder}
        >
          {schema.oneOf.map((prop, i) => (
            <option key={i} value={i}>
              {prop.$name}
            </option>
          ))}
        </Select>
      )}
      {category !== null &&
        schema.oneOf[category].required.map((key) => {
          const data = schema.properties[key];
          return (
            <DisplayField key={key} name={key} data={data} required={true} />
          );
        })}
      {Object.keys(schema.properties)
        .filter(
          (key) =>
            !schema?.oneOf?.find((x) => x?.required?.includes(key)) &&
            !schema.properties[key].$hidden
        )
        .map((key) => {
          const data = schema.properties[key];
          return (
            <DisplayField key={key} name={key} data={data} required={false} />
          );
        })}
    </VStack>
  );
};

export const DisplayField: FC<{
  name: string;
  data: any;
  required: boolean;
}> = (props) => {
  const { t } = useTranslation();
  const [invalid, setInvalid] = useState(false);
  const [fieldValue, setFieldValue] = useState("");
  const { value, setValue } = useContext(ValueContext);

  useEffect(() => {
    if (props.data.$preSet) {
      setFieldValue((props.data.$preSet ?? "").replace("$input", ""));
    }
  }, [props.data]);

  useEffect(() => {
    if (props.data.type === "object" && !value[props.name]) {
      value[props.name] = {};
      setValue(value);
    }
  }, [value]);

  function getType() {
    if (props.data.$password) {
      return "password";
    }
    switch (props.data.type) {
      case "string": {
        return "text";
      }
      default: {
        return props.data.type || "text";
      }
    }
  }

  if (!value[props.name]) {
    value[props.name] = {};
  }

  if (props.data.$itemType) {
    return (
      <SelectFromData
        endpoint={props.data.$itemType}
        onSelect={(o) => {
          console.log("selected");
          console.log(o);
          value[props.name] = props.data.$key && o ? o[props.data.$key] : o;
          console.log(value);
          setValue(value);
        }}
        mapName={(obj) =>
          (props.data.$keyFormat && obj[props.data.$keyFormat]) ||
          obj.name ||
          obj._id
        }
      />
    );
  }
  return props.data.type === "object" ? (
    <ValueContext.Provider
      value={{
        value: value[props.name],
        setValue: (v) => {
          value[props.name] = v;
          setValue(value);
        },
      }}
    >
      <MultiField schema={props.data} />
    </ValueContext.Provider>
  ) : (
    <FormControl width="100%" isInvalid={invalid} isRequired={props.required}>
      <FormLabel>{t(props.data.$name || props.name)}</FormLabel>
      <Input
        value={fieldValue}
        width="100%"
        autoComplete="none"
        onChange={(e) => {
          const v: any = e.target.value;
          setFieldValue(v);
          if (props.data.length && v.length !== props.data.length) {
            setInvalid(true);
            return;
          }
          value[props.name] = v;
          setValue(value);
          setInvalid(false);
        }}
        type={getType()}
        placeholder={props.data.$placeholder}
      />
    </FormControl>
  );
};

export default BaseForm;
