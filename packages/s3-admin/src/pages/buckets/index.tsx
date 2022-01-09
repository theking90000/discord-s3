import { Box, Flex, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { FC } from "react";
import { GrStorage } from "react-icons/gr";
import { useQuery } from "react-query";
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
  const { isLoading, isError, data } = useFetchQuery<Bucket[]>("buckets", {
    refetchInterval: 5000,
  });

  return (
    <SideBar>
      <Box mx="10" my="2" height="100%">
        <Text fontFamily="monospace" fontSize="3xl">
          {t("buckets")}
        </Text>
        <Flex
          sx={{
            "&::-webkit-scrollbar": {
              width: "4px",
              borderRadius: "2px",
              backgroundColor: `rgba(0, 0, 0, 0.05)`,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: `rgba(0, 0, 0, 0.05)`,
            },
          }}
          overflowY="auto"
          height="80vh"
          width="100%"
          justifyContent="center"
        >
          <VStack width="100%">
            {isLoading && <Spinner />}
            {data &&
              data.map((bucket) => <Item key={bucket._id} {...bucket} />)}
          </VStack>
        </Flex>
      </Box>
    </SideBar>
  );
};

const Item: FC<Bucket> = ({ name, owner, size, _id }) => {
  return (
    <Link passHref href={`/buckets/${_id}`}>
      <Box
        _hover={{ bgColor: "teal.400" }}
        cursor="pointer"
        width="100%"
        borderWidth={1}
        borderRadius="4px"
        p="5"
      >
        <HStack>
          <Box sx={{ stroke: "#ffffff !important" }} mr="2">
            <GrStorage stroke="currentColor" />
          </Box>
          <Text fontSize="md" fontFamily="monospace">
            {name}
          </Text>
        </HStack>
      </Box>
    </Link>
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
