import {
  Box,
  Button,
  Code,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { FC } from "react";

import SideBar from "../../../components/SideBar";
import { AccessKey } from "../../../lib/data";
import {
  axiosApiClient,
  axiosClient,
  useFetchQuery,
} from "../../../lib/data-fetch";

export interface Bucket {
  name: string;
  owner?: string;
  size?: number;
  _id?: string;
}

const page: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation("buckets");
  const { t: common } = useTranslation("common");
  const { data, isError, isLoading, refetch } = useFetchQuery<AccessKey[]>(
    `/buckets/${id}/keys`
  );

  async function createKey() {
    await axiosApiClient.post(`/buckets/${id}/keys`);
    refetch();
  }

  return (
    <SideBar>
      <Box mx="10" my="2" height="100%">
        <HStack>
          <Text fontFamily="monospace" fontSize="3xl">
            {t("add_key")}
          </Text>
          <Button onClick={createKey}>{t("create_key")}</Button>
        </HStack>
        <VStack>
          {isLoading && <Spinner />}
          {isError && <Text color="red.500">{common("error")}</Text>}
          {data &&
            data.map((key, i) => (
              <Box key={i}>
                <HStack>
                  <Text>
                    {t("access_key")}
                    <Code>{key.keyId}</Code>
                  </Text>
                  <Text>
                    {t("secret_key")}
                    <Code>{key.keySecret}</Code>
                  </Text>
                </HStack>
              </Box>
            ))}
        </VStack>
      </Box>
    </SideBar>
  );
};

export async function getServerSideProps({ locale, params }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "buckets"])),
      id: params.id,
    },
  };
}

export default page;
