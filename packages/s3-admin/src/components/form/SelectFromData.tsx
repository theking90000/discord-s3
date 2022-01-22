import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
} from "@chakra-ui/react";
import { useTranslation } from "next-i18next";
import { FC, useEffect, useState } from "react";
import { useFetchQuery } from "../../lib/data-fetch";
import BaseForm from "./BaseForm";

const SelectFromData: FC<{
  endpoint: string;
  mapName?: (obj: any) => string;
  onSelect?: (obj: any) => void;
}> = ({ endpoint, mapName = (obj) => obj.name, onSelect }) => {
  const { data, isLoading, refetch } = useFetchQuery<any[]>(endpoint);
  const { t } = useTranslation("common");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (data && selected !== -1 && onSelect && data[selected] !== undefined) {
      onSelect(data[selected]);
    }
  }, [selected, data]);

  const [open, setOpen] = useState(false);

  return (
    <>
      <Modal onClose={() => setOpen(false)} isOpen={open}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("create_new")}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <BaseForm
              path={endpoint}
              onSubmited={async (o) => {
                await refetch();
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
      {isLoading ? (
        <Spinner />
      ) : (
        <Select
          onClick={() => {
            if (
              selected === undefined ||
              (selected === 0 && data.length === 0)
            ) {
              setOpen(true);
            }
          }}
          value={selected}
          onChange={(e) =>
            e.target.value == "-1"
              ? setSelected(undefined)
              : setSelected(Number(e.target.value))
          }
        >
          {data &&
            data.map((obj, key) => (
              <option key={key} value={key}>
                {mapName(obj)}
              </option>
            ))}
          <option onClick={() => setOpen(true)} value="-1">
            {t("create_new")}
          </option>
        </Select>
      )}
    </>
  );
};

export default SelectFromData;
