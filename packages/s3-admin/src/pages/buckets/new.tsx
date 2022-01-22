import {
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { FC } from "react";
import { GrStorage } from "react-icons/gr";
import { useQuery } from "react-query";
import BaseForm from "../../components/form/BaseForm";
import SideBar from "../../components/SideBar";
import { axiosApiClient, useFetchQuery } from "../../lib/data-fetch";

export interface Bucket {
  name: string;
  owner?: string;
  size?: number;
  _id?: string;
}

const page: FC = () => {
  const { t } = useTranslation("buckets");

  return (
    <SideBar>
      <Box mx="10" my="2" height="100%">
        <HStack>
          <Text fontFamily="monospace" fontSize="3xl">
            {t("add_provider")}
          </Text>
        </HStack>
        <BaseForm path="/buckets" />
      </Box>
    </SideBar>
  );
};

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "buckets"])),
    },
  };
}

export default page;
